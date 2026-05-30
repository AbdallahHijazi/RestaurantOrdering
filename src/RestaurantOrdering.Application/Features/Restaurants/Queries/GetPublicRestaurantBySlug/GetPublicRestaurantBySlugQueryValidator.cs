using FluentValidation;

namespace RestaurantOrdering.Application.Features.Restaurants.Queries.GetPublicRestaurantBySlug;

public sealed class GetPublicRestaurantBySlugQueryValidator
    : AbstractValidator<GetPublicRestaurantBySlugQuery>
{
    private const string SlugPattern = @"^[a-z0-9]+(?:-[a-z0-9]+)*$";

    public GetPublicRestaurantBySlugQueryValidator()
    {
        RuleFor(x => x.Slug)
            .NotEmpty()
            .MaximumLength(150)
            .Matches(SlugPattern);
    }
}
