using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Categories.Common;
using RestaurantOrdering.Application.Features.Categories.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.UpdateCatalogCategory;

public sealed class UpdateCatalogCategoryCommandHandler
    : IRequestHandler<UpdateCatalogCategoryCommand, CategoryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly IPublishedTranslationWriter _publishedTranslationWriter;
    private readonly ITranslationJobEnqueuer _translationJobEnqueuer;

    public UpdateCatalogCategoryCommandHandler(
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

    public async Task<CategoryDto> Handle(
        UpdateCatalogCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(
                c => c.Id == request.CategoryId && c.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (category is null)
        {
            throw new NotFoundException("Category", request.CategoryId);
        }

        var defaultLocale = await _publishedTranslationWriter.GetRestaurantDefaultLocaleAsync(
            request.RestaurantId,
            cancellationToken);

        var name = request.Name.Trim();
        var description = request.Description?.Trim();
        var (currentName, currentDescription) = await PrimaryLocaleContentVersion.GetCategoryContentAsync(
            _context,
            category,
            defaultLocale,
            cancellationToken);

        var contentChanged = PrimaryLocaleContentVersion.BumpCategoryIfPrimaryContentChanged(
            category,
            currentName,
            currentDescription,
            name,
            description);

        PrimaryLocaleLegacySync.ApplyCategory(category, defaultLocale, name, description);
        category.DisplayOrder = request.DisplayOrder;
        category.IsActive = request.IsActive;
        category.UpdatedAt = _dateTimeService.UtcNow;

        if (contentChanged)
        {
            await _publishedTranslationWriter.UpsertCategoryPrimaryLocaleTranslationAsync(
                category,
                defaultLocale,
                name,
                description,
                isManualEdit: true,
                cancellationToken);

            await _translationJobEnqueuer.EnqueueForEntityAsync(
                request.RestaurantId,
                TranslatableEntityType.Category,
                category.Id,
                category.ContentVersion,
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var itemCount = await _context.MenuItems
            .AsNoTracking()
            .CountAsync(item => item.CategoryId == category.Id, cancellationToken);

        var translations = await LegacyBilingualTranslationLoader.LoadCategoriesAsync(
            _context,
            [category.Id],
            cancellationToken);

        return category.ToDto(
            itemCount,
            LegacyBilingualTranslationLoader.GetCategoryTranslation(translations, category.Id, "ar"),
            LegacyBilingualTranslationLoader.GetCategoryTranslation(translations, category.Id, "en"));
    }
}
