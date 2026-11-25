using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Categories.Common;
using RestaurantOrdering.Application.Features.Categories.DTOs;

namespace RestaurantOrdering.Application.Features.Categories.Queries.GetCategoryById;

public sealed class GetCategoryByIdQueryHandler
    : IRequestHandler<GetCategoryByIdQuery, CategoryDto>
{
    private readonly IApplicationDbContext _context;

    public GetCategoryByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CategoryDto> Handle(
        GetCategoryByIdQuery request,
        CancellationToken cancellationToken)
    {
        var category = await _context.Categories
            .AsNoTracking()
            .Where(c => c.Id == request.CategoryId && c.RestaurantId == request.RestaurantId)
            .Select(c => new
            {
                Category = c,
                ItemCount = c.MenuItems.Count()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (category is null)
        {
            throw new NotFoundException("Category", request.CategoryId);
        }

        var translations = await LegacyBilingualTranslationLoader.LoadCategoriesAsync(
            _context,
            [category.Category.Id],
            cancellationToken);

        return category.Category.ToDto(
            itemCount: category.ItemCount,
            arTranslation: LegacyBilingualTranslationLoader.GetCategoryTranslation(translations, category.Category.Id, "ar"),
            enTranslation: LegacyBilingualTranslationLoader.GetCategoryTranslation(translations, category.Category.Id, "en"));
    }
}
