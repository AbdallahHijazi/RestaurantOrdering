using FluentValidation;

namespace RestaurantOrdering.Application.Features.Categories.Queries.GetCategoryById;

public sealed class GetCategoryByIdQueryValidator : AbstractValidator<GetCategoryByIdQuery>
{
    public GetCategoryByIdQueryValidator()
    {
        RuleFor(x => x.CategoryId)
            .NotEmpty();

        RuleFor(x => x.RestaurantId)
            .NotEmpty();
    }
}
