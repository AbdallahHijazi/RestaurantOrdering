using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.MenuItems.Common;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;

namespace RestaurantOrdering.Application.Features.MenuItems.Commands.UpdateMenuItem;

public sealed class UpdateMenuItemCommandHandler
    : IRequestHandler<UpdateMenuItemCommand, MenuItemDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public UpdateMenuItemCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<MenuItemDto> Handle(
        UpdateMenuItemCommand request,
        CancellationToken cancellationToken)
    {
        var menuItem = await _context.MenuItems
            .FirstOrDefaultAsync(
                item => item.Id == request.MenuItemId && item.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (menuItem is null)
        {
            throw new NotFoundException("MenuItem", request.MenuItemId);
        }

        var categoryExists = await _context.Categories
            .AnyAsync(
                c => c.Id == request.CategoryId && c.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (!categoryExists)
        {
            throw new NotFoundException("Category", request.CategoryId);
        }

        if (request.ImageFileId.HasValue)
        {
            var imageExists = await _context.MediaFiles
                .AnyAsync(
                    m => m.Id == request.ImageFileId.Value && m.RestaurantId == request.RestaurantId,
                    cancellationToken);

            if (!imageExists)
            {
                throw new NotFoundException("MediaFile", request.ImageFileId.Value);
            }
        }

        menuItem.CategoryId = request.CategoryId;
        menuItem.ImageFileId = request.ImageFileId;
        menuItem.NameAr = request.NameAr.Trim();
        menuItem.NameEn = request.NameEn?.Trim();
        menuItem.DescriptionAr = request.DescriptionAr?.Trim();
        menuItem.DescriptionEn = request.DescriptionEn?.Trim();
        menuItem.Price = request.Price;
        menuItem.DiscountPrice = request.DiscountPrice;
        menuItem.DisplayOrder = request.DisplayOrder;
        menuItem.IsAvailable = request.IsAvailable;
        menuItem.IsActive = request.IsActive;
        menuItem.UpdatedAt = _dateTimeService.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return menuItem.ToDto();
    }
}
