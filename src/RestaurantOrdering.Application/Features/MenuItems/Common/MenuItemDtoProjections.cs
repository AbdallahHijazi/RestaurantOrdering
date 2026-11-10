using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.MenuItems.Common;

public static class MenuItemDtoProjections
{
    public static IQueryable<MenuItemDto> ProjectToDto(
        this IQueryable<MenuItem> menuItems,
        IQueryable<MediaFile> mediaFiles) =>
        from item in menuItems
        join media in mediaFiles on item.ImageFileId equals (Guid?)media.Id into mediaJoin
        from media in mediaJoin.DefaultIfEmpty()
        select new MenuItemDto
        {
            Id = item.Id,
            RestaurantId = item.RestaurantId,
            CategoryId = item.CategoryId,
            ImageFileId = item.ImageFileId,
            ImageUrl = media != null ? media.FileUrl : null,
            NameAr = item.NameAr,
            NameEn = item.NameEn,
            DescriptionAr = item.DescriptionAr,
            DescriptionEn = item.DescriptionEn,
            Price = item.Price,
            DiscountPrice = item.DiscountPrice,
            DisplayOrder = item.DisplayOrder,
            IsAvailable = item.IsAvailable,
            IsActive = item.IsActive,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        };

    public static async Task<MenuItemDto> GetProjectedDtoByIdAsync(
        IApplicationDbContext context,
        Guid menuItemId,
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var menuItem = await context.MenuItems
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == menuItemId && item.RestaurantId == restaurantId,
                cancellationToken);

        if (menuItem is null)
        {
            throw new NotFoundException("MenuItem", menuItemId);
        }

        string? imageUrl = null;
        if (menuItem.ImageFileId.HasValue)
        {
            imageUrl = await context.MediaFiles
                .AsNoTracking()
                .Where(media => media.Id == menuItem.ImageFileId.Value)
                .Select(media => media.FileUrl)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var translations = await LegacyBilingualTranslationLoader.LoadMenuItemsAsync(
            context,
            [menuItem.Id],
            cancellationToken);

        return menuItem.ToDto(
            imageUrl,
            LegacyBilingualTranslationLoader.GetMenuItemTranslation(translations, menuItem.Id, "ar"),
            LegacyBilingualTranslationLoader.GetMenuItemTranslation(translations, menuItem.Id, "en"));
    }
}
