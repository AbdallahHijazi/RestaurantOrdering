using FluentValidation;

namespace RestaurantOrdering.Application.Features.Restaurants.Queries.GetRestaurantById;

public sealed class GetRestaurantByIdQueryValidator : AbstractValidator<GetRestaurantByIdQuery>
{
    public GetRestaurantByIdQueryValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();
    }
}
