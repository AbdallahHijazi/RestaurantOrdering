using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.MenuItems.Common;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.UpdateCatalogMenuItem;

public sealed class UpdateCatalogMenuItemCommandHandler
    : IRequestHandler<UpdateCatalogMenuItemCommand, MenuItemDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly IPublishedTranslationWriter _publishedTranslationWriter;

    public UpdateCatalogMenuItemCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService,
        IPublishedTranslationWriter publishedTranslationWriter)
    {
        _context = context;
        _dateTimeService = dateTimeService;
        _publishedTranslationWriter = publishedTranslationWriter;
    }

    public async Task<MenuItemDto> Handle(
        UpdateCatalogMenuItemCommand request,
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

        var defaultLocale = await _publishedTranslationWriter.GetRestaurantDefaultLocaleAsync(
            request.RestaurantId,
            cancellationToken);

        var name = request.Name.Trim();
        var description = request.Description?.Trim();
        var (currentName, currentDescription) = await PrimaryLocaleContentVersion.GetMenuItemContentAsync(
            _context,
            menuItem,
            defaultLocale,
            cancellationToken);

        var contentChanged = PrimaryLocaleContentVersion.BumpMenuItemIfPrimaryContentChanged(
            menuItem,
            currentName,
            currentDescription,
            name,
            description);

        menuItem.CategoryId = request.CategoryId;
        menuItem.ImageFileId = request.ImageFileId;
        PrimaryLocaleLegacySync.ApplyMenuItem(menuItem, defaultLocale, name, description);
        menuItem.Price = request.Price;
        menuItem.DiscountPrice = request.DiscountPrice;
        menuItem.DisplayOrder = request.DisplayOrder;
        menuItem.IsAvailable = request.IsAvailable;
        menuItem.IsActive = request.IsActive;
        menuItem.UpdatedAt = _dateTimeService.UtcNow;

        if (contentChanged)
        {
            await _publishedTranslationWriter.UpsertMenuItemPrimaryLocaleTranslationAsync(
                menuItem,
                defaultLocale,
                name,
                description,
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
