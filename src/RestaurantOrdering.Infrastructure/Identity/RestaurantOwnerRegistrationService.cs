using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Auth.DTOs;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Persistence;

namespace RestaurantOrdering.Infrastructure.Identity;

public sealed class RestaurantOwnerRegistrationService : IRestaurantOwnerRegistrationService
{
    private const string DuplicateEmailMessage = "Unable to register user with the provided details.";
    private const string DuplicateSlugMessage = "Restaurant slug is already in use.";
    private const string CleanupFailureMessage = "Failed to complete registration cleanup after a partial failure.";
    private const string DefaultRestaurantPhoneNumber = "+0000000000";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly ILogger<RestaurantOwnerRegistrationService> _logger;

    public RestaurantOwnerRegistrationService(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        IDateTimeService dateTimeService,
        ILogger<RestaurantOwnerRegistrationService> logger)
    {
        _userManager = userManager;
        _context = context;
        _dateTimeService = dateTimeService;
        _logger = logger;
    }

    public async Task<RegisterRestaurantOwnerResultDto> RegisterRestaurantOwnerAsync(
        string email,
        string password,
        string fullName,
        string? phoneNumber,
        string restaurantNameAr,
        string? restaurantNameEn,
        string slug,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var trimmedEmail = email.Trim();
        var normalizedSlug = SlugNormalizer.Normalize(slug);
        var normalizedPhoneNumber = string.IsNullOrWhiteSpace(phoneNumber) ? null : phoneNumber.Trim();
        var userId = Guid.NewGuid();
        var restaurantId = Guid.NewGuid();
        var now = _dateTimeService.UtcNow;

        var existingUser = await _userManager.FindByEmailAsync(trimmedEmail);
        if (existingUser is not null)
        {
            throw new ConflictException(DuplicateEmailMessage);
        }

        var slugInUse = await _context.Restaurants
            .AsNoTracking()
            .AnyAsync(restaurant => restaurant.Slug == normalizedSlug, cancellationToken);
        if (slugInUse)
        {
            throw new ConflictException(DuplicateSlugMessage);
        }

        var user = new ApplicationUser
        {
            Id = userId,
            UserName = trimmedEmail,
            Email = trimmedEmail,
            EmailConfirmed = false,
            FullName = fullName.Trim(),
            PhoneNumber = normalizedPhoneNumber,
            RestaurantId = null,
            IsActive = true,
            IsDeleted = false,
            LockoutEnabled = true,
            CreatedAt = now
        };

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        var createUserResult = await _userManager.CreateAsync(user, password);
        if (!createUserResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);

            if (createUserResult.Errors.Any(error => error.Code is "DuplicateUserName" or "DuplicateEmail"))
            {
                throw new ConflictException(DuplicateEmailMessage);
            }

            throw new ValidationException(
                createUserResult.Errors.Select(error =>
                    new FluentValidation.Results.ValidationFailure("Password", error.Description)));
        }

        var restaurant = new Restaurant
        {
            Id = restaurantId,
            OwnerId = userId,
            Slug = normalizedSlug,
            NameAr = restaurantNameAr.Trim(),
            NameEn = string.IsNullOrWhiteSpace(restaurantNameEn) ? null : restaurantNameEn.Trim(),
            PhoneNumber = normalizedPhoneNumber ?? DefaultRestaurantPhoneNumber,
            IsActive = true,
            IsDeleted = false,
            CreatedAt = now
        };

        var restaurantSettings = new RestaurantSettings
        {
            Id = Guid.NewGuid(),
            RestaurantId = restaurantId,
            CurrencyCode = "USD",
            TimeZone = "UTC",
            TaxRate = 0,
            DeliveryFee = 0,
            MinimumOrderAmount = 0,
            IsDeliveryEnabled = true,
            IsPickupEnabled = true,
            WorkingHoursJson = null,
            CreatedAt = now
        };

        _context.Restaurants.Add(restaurant);
        _context.RestaurantSettings.Add(restaurantSettings);

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            _logger.LogWarning(
                exception,
                "Restaurant persistence failed during owner registration for user {UserId}.",
                userId);

            await CompensateFailedRegistrationAsync(userId, null, transaction, cancellationToken);
            throw new ConflictException(DuplicateSlugMessage);
        }

        user.RestaurantId = restaurantId;
        var updateUserResult = await _userManager.UpdateAsync(user);
        if (!updateUserResult.Succeeded)
        {
            _logger.LogError(
                "Failed to link user {UserId} to restaurant {RestaurantId}. Error codes: {ErrorCodes}",
                userId,
                restaurantId,
                string.Join(", ", updateUserResult.Errors.Select(error => error.Code)));

            await CompensateFailedRegistrationAsync(userId, restaurantId, transaction, cancellationToken);
            throw new InvalidOperationException(
                $"Failed to link owner to restaurant: {FormatIdentityErrors(updateUserResult)}");
        }

        var addRoleResult = await _userManager.AddToRoleAsync(user, ApplicationRoles.RestaurantOwner);
        if (!addRoleResult.Succeeded)
        {
            _logger.LogError(
                "Failed to assign owner role for user {UserId}. Error codes: {ErrorCodes}",
                userId,
                string.Join(", ", addRoleResult.Errors.Select(error => error.Code)));

            await CompensateFailedRegistrationAsync(userId, restaurantId, transaction, cancellationToken);
            throw new InvalidOperationException(
                $"Failed to assign owner role during registration: {FormatIdentityErrors(addRoleResult)}");
        }

        await transaction.CommitAsync(cancellationToken);

        return new RegisterRestaurantOwnerResultDto
        {
            UserId = userId,
            RestaurantId = restaurantId,
            Email = user.Email ?? trimmedEmail,
            Role = ApplicationRoles.RestaurantOwner
        };
    }

    private async Task CompensateFailedRegistrationAsync(
        Guid userId,
        Guid? restaurantId,
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
                "Transaction rollback failed during owner registration for user {UserId}.",
                userId);
        }

        if (restaurantId.HasValue)
        {
            var persistedRestaurant = await _context.Restaurants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(restaurant => restaurant.Id == restaurantId.Value, cancellationToken);

            if (persistedRestaurant is not null)
            {
                _context.Restaurants.Remove(persistedRestaurant);
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        var persistedUser = await _userManager.FindByIdAsync(userId.ToString());
        if (persistedUser is null)
        {
            return;
        }

        var deleteResult = await _userManager.DeleteAsync(persistedUser);
        if (!deleteResult.Succeeded)
        {
            _logger.LogError(
                "Compensating delete failed for user {UserId}. Error codes: {ErrorCodes}",
                userId,
                string.Join(", ", deleteResult.Errors.Select(error => error.Code)));

            throw new InvalidOperationException(CleanupFailureMessage);
        }
    }

    private static string FormatIdentityErrors(IdentityResult result) =>
        string.Join("; ", result.Errors.Select(error => error.Description));
}
