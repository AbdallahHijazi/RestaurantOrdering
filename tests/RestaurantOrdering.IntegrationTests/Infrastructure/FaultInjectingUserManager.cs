using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RestaurantOrdering.Infrastructure.Identity;

namespace RestaurantOrdering.IntegrationTests.Infrastructure;

internal sealed class FaultInjectingUserManager : UserManager<ApplicationUser>
{
    internal IdentityFaultInjection FaultInjection { get; set; }

    public FaultInjectingUserManager(
        IUserStore<ApplicationUser> store,
        IOptions<IdentityOptions> optionsAccessor,
        IPasswordHasher<ApplicationUser> passwordHasher,
        IEnumerable<IUserValidator<ApplicationUser>> userValidators,
        IEnumerable<IPasswordValidator<ApplicationUser>> passwordValidators,
        ILookupNormalizer keyNormalizer,
        IdentityErrorDescriber errors,
        IServiceProvider services,
        ILogger<UserManager<ApplicationUser>> logger)
        : base(
            store,
            optionsAccessor,
            passwordHasher,
            userValidators,
            passwordValidators,
            keyNormalizer,
            errors,
            services,
            logger)
    {
        FaultInjection = new IdentityFaultInjection();
    }

    public override Task<IdentityResult> AddToRoleAsync(ApplicationUser user, string role) =>
        FaultInjection.ShouldFailAddToRole()
            ? Task.FromResult(CreateInjectedFailure("Injected AddToRoleAsync failure."))
            : base.AddToRoleAsync(user, role);

    public override Task<IdentityResult> DeleteAsync(ApplicationUser user) =>
        FaultInjection.ShouldFailDelete()
            ? Task.FromResult(CreateInjectedFailure("Injected DeleteAsync failure."))
            : base.DeleteAsync(user);

    public override Task<IdentityResult> RemoveFromRoleAsync(ApplicationUser user, string role) =>
        FaultInjection.ShouldFailRemoveFromRole(role)
            ? Task.FromResult(CreateInjectedFailure("Injected RemoveFromRoleAsync failure."))
            : base.RemoveFromRoleAsync(user, role);

    private static IdentityResult CreateInjectedFailure(string description) =>
        IdentityResult.Failed(new IdentityError
        {
            Code = "InjectedFault",
            Description = description
        });
}

internal sealed class IdentityFaultInjection
{
    public static IdentityFaultInjection None { get; } = new();

    public bool FailAddToRole { get; set; }
    public bool FailDelete { get; set; }
    public bool FailRemoveFromRole { get; set; }
    public string? FailRemoveFromRoleName { get; set; }
    public bool FailRestoreStaffRoles { get; set; }

    private int _addToRoleCallCount;
    private int _removeFromRoleCallCount;

    internal bool ShouldFailAddToRole()
    {
        if (!FailAddToRole && !FailRestoreStaffRoles)
        {
            return false;
        }

        _addToRoleCallCount++;

        if (FailAddToRole && _addToRoleCallCount == 1)
        {
            return true;
        }

        return FailRestoreStaffRoles && _addToRoleCallCount > 1;
    }

    internal bool ShouldFailDelete() => FailDelete;

    internal bool ShouldFailRemoveFromRole(string role)
    {
        if (!FailRemoveFromRole)
        {
            return false;
        }

        _removeFromRoleCallCount++;

        if (!string.IsNullOrWhiteSpace(FailRemoveFromRoleName))
        {
            return string.Equals(FailRemoveFromRoleName, role, StringComparison.Ordinal);
        }

        return _removeFromRoleCallCount == 1;
    }
}
