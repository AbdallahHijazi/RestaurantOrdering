using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
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
        var dto = await context.MenuItems
            .AsNoTracking()
            .Where(item => item.Id == menuItemId && item.RestaurantId == restaurantId)
            .ProjectToDto(context.MediaFiles.AsNoTracking())
            .FirstOrDefaultAsync(cancellationToken);

        return dto ?? throw new NotFoundException("MenuItem", menuItemId);
    }
}
