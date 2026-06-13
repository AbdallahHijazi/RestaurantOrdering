using FluentAssertions;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Domain.Enums;
using Xunit;

namespace RestaurantOrdering.UnitTests;

public sealed class RestaurantPermissionMatrixTests
{
    [Theory]
    [InlineData(ApplicationRoles.RestaurantManager, RestaurantPermission.RestaurantSettingsManageLocales, true)]
    [InlineData(ApplicationRoles.RestaurantManager, RestaurantPermission.TranslationsApprove, true)]
    [InlineData(ApplicationRoles.KitchenManager, RestaurantPermission.TranslationsView, true)]
    [InlineData(ApplicationRoles.KitchenManager, RestaurantPermission.RestaurantSettingsManageLocales, false)]
    [InlineData(ApplicationRoles.KitchenManager, RestaurantPermission.TranslationsApprove, false)]
    [InlineData(ApplicationRoles.RestaurantOwner, RestaurantPermission.TranslationsApprove, false)]
    public void CanRoleReceivePermission_MatchesCentralMatrix(
        string role,
        RestaurantPermission permission,
        bool expected) =>
        RestaurantPermissionMatrix.CanRoleReceivePermission(role, permission).Should().Be(expected);

    [Fact]
    public void Catalog_ContainsAllPermissionsWithStableStorageNames()
    {
        RestaurantPermissionCatalog.All.Should().HaveCount(9);
        RestaurantPermissionCatalog.ToStorageName(RestaurantPermission.TranslationsApprove)
            .Should().Be("Translations.Approve");
        RestaurantPermissionCatalog.ToStorageName(RestaurantPermission.RestaurantSettingsManageLocales)
            .Should().Be("RestaurantSettings.ManageLocales");
    }
}
