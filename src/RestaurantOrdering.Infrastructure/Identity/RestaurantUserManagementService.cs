using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;

namespace RestaurantOrdering.Infrastructure.Identity;

public sealed class RestaurantUserManagementService : IRestaurantUserManagementService
{
    private const string DuplicateUserMessage = "Unable to create user with the provided details.";
    private const string ForbiddenRoleChangeMessage = "You are not allowed to change this user's role.";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<RestaurantUserManagementService> _logger;

    public RestaurantUserManagementService(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        ILogger<RestaurantUserManagementService> logger)
    {
        _userManager = userManager;
        _context = context;
        _logger = logger;
    }

    public async Task<RestaurantUserDto> CreateRestaurantStaffUserAsync(
        Guid restaurantId,
        string email,
        string password,
        string? fullName,
        string? phoneNumber,
        string role,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!AssignableRestaurantStaffRoles.IsAllowed(role))
        {
            throw new ValidationException(
            [
                new FluentValidation.Results.ValidationFailure(nameof(role), "Role must be RestaurantManager or KitchenManager.")
            ]);
        }

        var normalizedEmail = email.Trim();
        var existingUser = await _userManager.FindByEmailAsync(normalizedEmail);

        if (existingUser is not null)
        {
            throw new ConflictException(DuplicateUserMessage);
        }

        var user = new ApplicationUser
        {
            UserName = normalizedEmail,
            Email = normalizedEmail,
            EmailConfirmed = false,
            FullName = string.IsNullOrWhiteSpace(fullName) ? null : fullName.Trim(),
            PhoneNumber = string.IsNullOrWhiteSpace(phoneNumber) ? null : phoneNumber.Trim(),
            RestaurantId = restaurantId,
            IsActive = true,
            IsDeleted = false,
            LockoutEnabled = true,
            CreatedAt = DateTime.UtcNow
        };

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        var createResult = await _userManager.CreateAsync(user, password);

        if (!createResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);

            if (createResult.Errors.Any(error =>
                    error.Code is "DuplicateUserName" or "DuplicateEmail"))
            {
                throw new ConflictException(DuplicateUserMessage);
            }

            throw new ValidationException(
                createResult.Errors.Select(error =>
                    new FluentValidation.Results.ValidationFailure("Password", error.Description)));
        }

        var addRoleResult = await _userManager.AddToRoleAsync(user, role);

        if (!addRoleResult.Succeeded)
        {
            await CompensateFailedUserCreationAsync(user, transaction, cancellationToken);

            throw new InvalidOperationException(
                $"Failed to assign role to restaurant user: {FormatIdentityErrors(addRoleResult)}");
        }

        await transaction.CommitAsync(cancellationToken);

        return new RestaurantUserDto
        {
            Id = user.Id,
            Email = user.Email ?? normalizedEmail,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            RestaurantId = restaurantId,
            Role = role,
            IsActive = user.IsActive
        };
    }

    public async Task<RestaurantUserRoleDto> UpdateRestaurantStaffUserRoleAsync(
        Guid restaurantId,
        Guid userId,
        string role,
        Guid currentUserId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!AssignableRestaurantStaffRoles.IsAllowed(role))
        {
            throw new ValidationException(
            [
                new FluentValidation.Results.ValidationFailure(nameof(role), "Role must be RestaurantManager or KitchenManager.")
            ]);
        }

        if (userId == currentUserId)
        {
            throw new ForbiddenException(ForbiddenRoleChangeMessage);
        }

        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null || user.RestaurantId != restaurantId)
        {
            throw new NotFoundException("User", userId);
        }

        var restaurantOwnerId = await _context.Restaurants
            .AsNoTracking()
            .Where(restaurant => restaurant.Id == restaurantId)
            .Select(restaurant => restaurant.OwnerId)
            .SingleOrDefaultAsync(cancellationToken);

        if (restaurantOwnerId == userId || await _userManager.IsInRoleAsync(user, ApplicationRoles.RestaurantOwner))
        {
            throw new ForbiddenException(ForbiddenRoleChangeMessage);
        }

        var currentRoles = await _userManager.GetRolesAsync(user);
        var previousStaffRoles = currentRoles
            .Where(AssignableRestaurantStaffRoles.IsAllowed)
            .ToList();

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        var removedStaffRoles = new List<string>();

        foreach (var previousRole in previousStaffRoles)
        {
            var removeResult = await _userManager.RemoveFromRoleAsync(user, previousRole);

            if (!removeResult.Succeeded)
            {
                await CompensateFailedStaffRoleUpdateAsync(
                    user,
                    removedStaffRoles,
                    transaction,
                    cancellationToken);

                throw new InvalidOperationException(
                    $"Failed to remove existing staff role: {FormatIdentityErrors(removeResult)}");
            }

            removedStaffRoles.Add(previousRole);
        }

        var addRoleResult = await _userManager.AddToRoleAsync(user, role);

        if (!addRoleResult.Succeeded)
        {
            await CompensateFailedStaffRoleUpdateAsync(
                user,
                removedStaffRoles,
                transaction,
                cancellationToken);

            throw new InvalidOperationException(
                $"Failed to assign staff role: {FormatIdentityErrors(addRoleResult)}");
        }

        await transaction.CommitAsync(cancellationToken);

        return new RestaurantUserRoleDto
        {
            Id = user.Id,
            RestaurantId = restaurantId,
            Role = role
        };
    }

    private async Task CompensateFailedUserCreationAsync(
        ApplicationUser user,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        try
        {
            await transaction.RollbackAsync(cancellationToken);
        }
        catch (Exception rollbackException)
        {
            _logger.LogError(
                rollbackException,
                "Transaction rollback failed after role assignment failure for user {UserId}.",
                user.Id);
        }

        var persistedUser = await _userManager.FindByIdAsync(user.Id.ToString());

        if (persistedUser is null)
        {
            return;
        }

        var deleteResult = await _userManager.DeleteAsync(user);

        if (!deleteResult.Succeeded)
        {
            _logger.LogError(
                "Compensating delete failed for user {UserId}. Error codes: {ErrorCodes}",
                user.Id,
                string.Join(", ", deleteResult.Errors.Select(error => error.Code)));

            throw new InvalidOperationException(
                "Failed to complete user creation cleanup after role assignment failure.");
        }
    }

    private async Task CompensateFailedStaffRoleUpdateAsync(
        ApplicationUser user,
        IReadOnlyList<string> removedStaffRoles,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        try
        {
            await transaction.RollbackAsync(cancellationToken);
        }
        catch (Exception rollbackException)
        {
            _logger.LogError(
                rollbackException,
                "Transaction rollback failed during staff role update for user {UserId}.",
                user.Id);
        }

        if (removedStaffRoles.Count == 0)
        {
            return;
        }

        var currentRoles = await _userManager.GetRolesAsync(user);
        var rolesToRestore = removedStaffRoles
            .Where(role => !currentRoles.Contains(role))
            .ToList();

        if (rolesToRestore.Count == 0)
        {
            return;
        }

        await RestoreStaffRolesAsync(user, rolesToRestore, cancellationToken);
    }

    private async Task RestoreStaffRolesAsync(
        ApplicationUser user,
        IReadOnlyList<string> roles,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        foreach (var role in roles)
        {
            var restoreResult = await _userManager.AddToRoleAsync(user, role);

            if (!restoreResult.Succeeded)
            {
                _logger.LogError(
                    "Failed to restore staff role {RoleName} for user {UserId} during compensating rollback. Error codes: {ErrorCodes}",
                    role,
                    user.Id,
                    string.Join(", ", restoreResult.Errors.Select(error => error.Code)));

                throw new InvalidOperationException(
                    "Failed to restore staff role assignments during compensating rollback.");
            }
        }
    }

    private static string FormatIdentityErrors(IdentityResult result) =>
        string.Join("; ", result.Errors.Select(error => error.Description));
}
