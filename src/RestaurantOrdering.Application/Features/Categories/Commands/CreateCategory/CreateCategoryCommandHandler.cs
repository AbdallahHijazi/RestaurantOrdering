using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Categories.Common;
using RestaurantOrdering.Application.Features.Categories.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Categories.Commands.CreateCategory;

public sealed class CreateCategoryCommandHandler
    : IRequestHandler<CreateCategoryCommand, CategoryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public CreateCategoryCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<CategoryDto> Handle(
        CreateCategoryCommand request,
        CancellationToken cancellationToken)
    {
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

        await _context.SaveChangesAsync(cancellationToken);

        return category.ToDto(itemCount: 0);
    }
}
