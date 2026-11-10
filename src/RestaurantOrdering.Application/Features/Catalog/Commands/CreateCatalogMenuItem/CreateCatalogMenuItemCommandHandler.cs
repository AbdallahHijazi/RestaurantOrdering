using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.MenuItems.Common;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.CreateCatalogMenuItem;

public sealed class CreateCatalogMenuItemCommandHandler
    : IRequestHandler<CreateCatalogMenuItemCommand, MenuItemDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly IPublishedTranslationWriter _publishedTranslationWriter;
    private readonly ITranslationJobEnqueuer _translationJobEnqueuer;

    public CreateCatalogMenuItemCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService,
        IPublishedTranslationWriter publishedTranslationWriter,
        ITranslationJobEnqueuer translationJobEnqueuer)
    {
        _context = context;
        _dateTimeService = dateTimeService;
        _publishedTranslationWriter = publishedTranslationWriter;
        _translationJobEnqueuer = translationJobEnqueuer;
    }

    public async Task<MenuItemDto> Handle(
        CreateCatalogMenuItemCommand request,
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

        var defaultLocale = await _publishedTranslationWriter.GetRestaurantDefaultLocaleAsync(
            request.RestaurantId,
            cancellationToken);

        var name = request.Name.Trim();
        var description = request.Description?.Trim();

        var menuItem = new MenuItem
        {
            RestaurantId = request.RestaurantId,
            CategoryId = request.CategoryId,
            ImageFileId = request.ImageFileId,
            Price = request.Price,
            DiscountPrice = request.DiscountPrice,
            DisplayOrder = request.DisplayOrder,
            IsAvailable = request.IsAvailable,
            IsActive = request.IsActive,
            IsDeleted = false,
            CreatedAt = _dateTimeService.UtcNow
        };

        PrimaryLocaleLegacySync.ApplyMenuItem(menuItem, defaultLocale, name, description);

        _context.MenuItems.Add(menuItem);
        await _publishedTranslationWriter.UpsertMenuItemPrimaryLocaleTranslationAsync(
            menuItem,
            defaultLocale,
            name,
            description,
            isManualEdit: false,
            cancellationToken);

        await _translationJobEnqueuer.EnqueueForEntityAsync(
            request.RestaurantId,
            TranslatableEntityType.MenuItem,
            menuItem.Id,
            menuItem.ContentVersion,
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return await MenuItemDtoProjections.GetProjectedDtoByIdAsync(
            _context,
            menuItem.Id,
            menuItem.RestaurantId,
            cancellationToken);
    }
}
