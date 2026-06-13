using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Categories.Common;
using RestaurantOrdering.Application.Features.Categories.DTOs;

namespace RestaurantOrdering.Application.Features.Categories.Queries.GetCategories;

public sealed class GetCategoriesQueryHandler
    : IRequestHandler<GetCategoriesQuery, IReadOnlyList<CategoryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCategoriesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
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

        var translations = await LegacyBilingualTranslationLoader.LoadCategoriesAsync(
            _context,
            categories.Select(item => item.Category.Id).ToList(),
            cancellationToken);

        return categories
            .Select(item => item.Category.ToDto(
                itemCount: item.ItemCount,
                arTranslation: LegacyBilingualTranslationLoader.GetCategoryTranslation(translations, item.Category.Id, "ar"),
                enTranslation: LegacyBilingualTranslationLoader.GetCategoryTranslation(translations, item.Category.Id, "en")))
            .ToList()
            .AsReadOnly();
    }
}
