using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.MenuItems.Common;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.MenuItems.Commands.CreateMenuItem;

public sealed class CreateMenuItemCommandHandler
    : IRequestHandler<CreateMenuItemCommand, MenuItemDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public CreateMenuItemCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<MenuItemDto> Handle(
        CreateMenuItemCommand request,
        CancellationToken cancellationToken)
    {
        var restaurantExists = await _context.Restaurants
            .AnyAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (!restaurantExists)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
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

        var menuItem = new MenuItem
        {
            RestaurantId = request.RestaurantId,
            CategoryId = request.CategoryId,
            ImageFileId = request.ImageFileId,
            NameAr = request.NameAr.Trim(),
            NameEn = request.NameEn?.Trim(),
            DescriptionAr = request.DescriptionAr?.Trim(),
            DescriptionEn = request.DescriptionEn?.Trim(),
            Price = request.Price,
            DiscountPrice = request.DiscountPrice,
            DisplayOrder = request.DisplayOrder,
            IsAvailable = request.IsAvailable,
            IsActive = request.IsActive,
            IsDeleted = false,
            CreatedAt = _dateTimeService.UtcNow
        };

        _context.MenuItems.Add(menuItem);

        await _context.SaveChangesAsync(cancellationToken);

        return menuItem.ToDto();
    }
}
