using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Categories.Common;
using RestaurantOrdering.Application.Features.Categories.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.CreateCatalogCategory;

public sealed class CreateCatalogCategoryCommandHandler
    : IRequestHandler<CreateCatalogCategoryCommand, CategoryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly IPublishedTranslationWriter _publishedTranslationWriter;

    public CreateCatalogCategoryCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService,
        IPublishedTranslationWriter publishedTranslationWriter)
    {
        _context = context;
        _dateTimeService = dateTimeService;
        _publishedTranslationWriter = publishedTranslationWriter;
    }

    public async Task<CategoryDto> Handle(
        CreateCatalogCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var restaurantExists = await _context.Restaurants
            .AnyAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (!restaurantExists)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
        }

        var defaultLocale = await _publishedTranslationWriter.GetRestaurantDefaultLocaleAsync(
            request.RestaurantId,
            cancellationToken);

        var name = request.Name.Trim();
        var description = request.Description?.Trim();

        var category = new Category
        {
            RestaurantId = request.RestaurantId,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            IsDeleted = false,
            CreatedAt = _dateTimeService.UtcNow
        };

        PrimaryLocaleLegacySync.ApplyCategory(category, defaultLocale, name, description);

        _context.Categories.Add(category);
        await _publishedTranslationWriter.UpsertCategoryPrimaryLocaleTranslationAsync(
            category,
            defaultLocale,
            name,
            description,
            isManualEdit: false,
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        var translations = await LegacyBilingualTranslationLoader.LoadCategoriesAsync(
            _context,
            [category.Id],
            cancellationToken);

        return category.ToDto(
            itemCount: 0,
            LegacyBilingualTranslationLoader.GetCategoryTranslation(translations, category.Id, "ar"),
            LegacyBilingualTranslationLoader.GetCategoryTranslation(translations, category.Id, "en"));
    }
}
