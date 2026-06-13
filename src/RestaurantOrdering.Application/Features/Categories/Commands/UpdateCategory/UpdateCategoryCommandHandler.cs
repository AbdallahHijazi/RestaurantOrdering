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

    public UpdateCategoryCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<CategoryDto> Handle(
        UpdateCategoryCommand request,
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

        var nameAr = request.NameAr.Trim();
        var nameEn = request.NameEn?.Trim();
        var descriptionAr = request.DescriptionAr?.Trim();
        var descriptionEn = request.DescriptionEn?.Trim();

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
