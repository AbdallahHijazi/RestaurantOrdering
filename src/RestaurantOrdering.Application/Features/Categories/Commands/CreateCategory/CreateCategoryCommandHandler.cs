using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Categories.Common;
using RestaurantOrdering.Application.Features.Categories.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Categories.Commands.CreateCategory;

public sealed class CreateCategoryCommandHandler
    : IRequestHandler<CreateCategoryCommand, CategoryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly IPublishedTranslationWriter _publishedTranslationWriter;

    public CreateCategoryCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService,
        IPublishedTranslationWriter publishedTranslationWriter)
    {
        _context = context;
        _dateTimeService = dateTimeService;
        _publishedTranslationWriter = publishedTranslationWriter;
    }

    public async Task<CategoryDto> Handle(
        CreateCategoryCommand request,
        CancellationToken cancellationToken)
    {
        await _publishedTranslationWriter.EnsureLegacyBilingualWriteSupportedAsync(
            request.RestaurantId,
            cancellationToken);

        var restaurantExists = await _context.Restaurants
            .AnyAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (!restaurantExists)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
        }

        var category = new Category
        {
            RestaurantId = request.RestaurantId,
            NameAr = request.NameAr.Trim(),
            NameEn = request.NameEn?.Trim(),
            DescriptionAr = request.DescriptionAr?.Trim(),
            DescriptionEn = request.DescriptionEn?.Trim(),
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            IsDeleted = false,
            CreatedAt = _dateTimeService.UtcNow
        };

        _context.Categories.Add(category);
        await _publishedTranslationWriter.UpsertCategoryPublishedTranslationsAsync(
            category,
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
