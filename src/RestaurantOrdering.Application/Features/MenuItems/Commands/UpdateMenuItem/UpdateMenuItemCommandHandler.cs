using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.MenuItems.Common;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;
using RestaurantOrdering.Application.Common.Localization;

namespace RestaurantOrdering.Application.Features.MenuItems.Commands.UpdateMenuItem;

public sealed class UpdateMenuItemCommandHandler
    : IRequestHandler<UpdateMenuItemCommand, MenuItemDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly IPublishedTranslationWriter _publishedTranslationWriter;

    public UpdateMenuItemCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService,
        IPublishedTranslationWriter publishedTranslationWriter)
    {
        _context = context;
        _dateTimeService = dateTimeService;
        _publishedTranslationWriter = publishedTranslationWriter;
    }

    public async Task<MenuItemDto> Handle(
        UpdateMenuItemCommand request,
        CancellationToken cancellationToken)
    {
        await _publishedTranslationWriter.EnsureLegacyBilingualWriteSupportedAsync(
            request.RestaurantId,
            cancellationToken);

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

        var nameAr = request.NameAr.Trim();
        var nameEn = request.NameEn?.Trim();
        var descriptionAr = request.DescriptionAr?.Trim();
        var descriptionEn = request.DescriptionEn?.Trim();
        var contentVersionBefore = menuItem.ContentVersion;

        TranslatableContentVersion.BumpMenuItemIfTranslatableContentChanged(
            menuItem,
            nameAr,
            nameEn,
            descriptionAr,
            descriptionEn);

        menuItem.NameAr = nameAr;
        menuItem.NameEn = nameEn;
        menuItem.DescriptionAr = descriptionAr;
        menuItem.DescriptionEn = descriptionEn;
        menuItem.Price = request.Price;
        menuItem.DiscountPrice = request.DiscountPrice;
        menuItem.DisplayOrder = request.DisplayOrder;
        menuItem.IsAvailable = request.IsAvailable;
        menuItem.IsActive = request.IsActive;
        menuItem.UpdatedAt = _dateTimeService.UtcNow;

        if (menuItem.ContentVersion > contentVersionBefore)
        {
            await _publishedTranslationWriter.UpsertMenuItemPublishedTranslationsAsync(
                menuItem,
                isManualEdit: true,
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await MenuItemDtoProjections.GetProjectedDtoByIdAsync(
            _context,
            menuItem.Id,
            menuItem.RestaurantId,
            cancellationToken);
    }
}
