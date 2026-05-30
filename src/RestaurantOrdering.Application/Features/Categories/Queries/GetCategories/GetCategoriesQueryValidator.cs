using FluentValidation;

namespace RestaurantOrdering.Application.Features.Categories.Queries.GetCategories;

public sealed class GetCategoriesQueryValidator : AbstractValidator<GetCategoriesQuery>
{
    public GetCategoriesQueryValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();
    }
}
