using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Categories.Common;
using RestaurantOrdering.Application.Features.Categories.DTOs;

namespace RestaurantOrdering.Application.Features.Categories.Queries.GetCategories;

public sealed class GetCategoriesQueryHandler
    : IRequestHandler<GetCategoriesQuery, IReadOnlyList<CategoryDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IPublicLocaleResolver _publicLocaleResolver;

    public GetCategoriesQueryHandler(
        IApplicationDbContext context,
        IPublicLocaleResolver publicLocaleResolver)
    {
        _context = context;
        _publicLocaleResolver = publicLocaleResolver;
    }

    public async Task<IReadOnlyList<CategoryDto>> Handle(
        GetCategoriesQuery request,
        CancellationToken cancellationToken)
    {
        var categories = await _context.Categories
            .AsNoTracking()
            .Where(c => c.RestaurantId == request.RestaurantId)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.NameAr)
            .Select(c => new
            {
                Category = c,
                ItemCount = c.MenuItems.Count()
            })
            .ToListAsync(cancellationToken);

        if (categories.Count == 0)
        {
            return Array.Empty<CategoryDto>();
        }

        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RestaurantId == request.RestaurantId, cancellationToken);

        var localeContext = await PublicLocaleContextLoader.LoadAsync(
            _context,
            request.RestaurantId,
            settings?.DefaultLocale,
            cancellationToken);

        var menuLocale = _publicLocaleResolver.ResolveMenuLocale(
            requestedLang: null,
            localeContext.DefaultLocale,
            localeContext.SupportedLocales,
            localeContext.LocaleDefinitions);

        var categoryIds = categories.Select(item => item.Category.Id).ToList();

        var legacyTranslations = await LegacyBilingualTranslationLoader.LoadCategoriesAsync(
            _context,
            categoryIds,
            cancellationToken);

        var primaryTranslations = await PublicMenuTranslationLoader.LoadCategoriesAsync(
            _context,
            categoryIds,
            cancellationToken);

        return categories
            .Select(item =>
            {
                var category = item.Category;
                var primaryContent = _publicLocaleResolver.ResolveAdminCatalogPrimaryContent(
                    menuLocale,
                    localeContext.DefaultLocale,
                    localeContext.SupportedLocales,
                    localeContext.LocaleDefinitions,
                    PublicMenuTranslationLoader.GetCategoryTranslations(primaryTranslations, category.Id),
                    category.ContentVersion,
                    category.NameAr,
                    category.NameEn,
                    category.DescriptionAr,
                    category.DescriptionEn);

                return category.ToDto(
                    itemCount: item.ItemCount,
                    arTranslation: LegacyBilingualTranslationLoader.GetCategoryTranslation(
                        legacyTranslations,
                        category.Id,
                        "ar"),
                    enTranslation: LegacyBilingualTranslationLoader.GetCategoryTranslation(
                        legacyTranslations,
                        category.Id,
                        "en"),
                    primaryContent: primaryContent);
            })
            .ToList()
            .AsReadOnly();
    }
}
