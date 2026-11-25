using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Categories.Common;
using RestaurantOrdering.Application.Features.Categories.DTOs;

namespace RestaurantOrdering.Application.Features.Categories.Commands.UpdateCategory;

public sealed class UpdateCategoryCommandHandler
    : IRequestHandler<UpdateCategoryCommand, CategoryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly IPublishedTranslationWriter _publishedTranslationWriter;

    public UpdateCategoryCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService,
        IPublishedTranslationWriter publishedTranslationWriter)
    {
        _context = context;
        _dateTimeService = dateTimeService;
        _publishedTranslationWriter = publishedTranslationWriter;
    }

    public async Task<CategoryDto> Handle(
        UpdateCategoryCommand request,
        CancellationToken cancellationToken)
    {
        await _publishedTranslationWriter.EnsureLegacyBilingualWriteSupportedAsync(
            request.RestaurantId,
            cancellationToken);

        var category = await _context.Categories
            .FirstOrDefaultAsync(
                c => c.Id == request.CategoryId && c.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (category is null)
        {
            throw new NotFoundException("Category", request.CategoryId);
        }

        var nameAr = request.NameAr.Trim();
        var nameEn = request.NameEn?.Trim();
        var descriptionAr = request.DescriptionAr?.Trim();
        var descriptionEn = request.DescriptionEn?.Trim();
        var contentVersionBefore = category.ContentVersion;

        TranslatableContentVersion.BumpCategoryIfTranslatableContentChanged(
            category,
            nameAr,
            nameEn,
            descriptionAr,
            descriptionEn);

        category.NameAr = nameAr;
        category.NameEn = nameEn;
        category.DescriptionAr = descriptionAr;
        category.DescriptionEn = descriptionEn;
        category.DisplayOrder = request.DisplayOrder;
        category.IsActive = request.IsActive;
        category.UpdatedAt = _dateTimeService.UtcNow;

        if (category.ContentVersion > contentVersionBefore)
        {
            await _publishedTranslationWriter.UpsertCategoryPublishedTranslationsAsync(
                category,
                isManualEdit: true,
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
