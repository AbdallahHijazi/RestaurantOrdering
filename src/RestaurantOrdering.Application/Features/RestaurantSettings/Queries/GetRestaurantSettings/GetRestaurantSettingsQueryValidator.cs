using FluentValidation;

namespace RestaurantOrdering.Application.Features.RestaurantSettings.Queries.GetRestaurantSettings;

public sealed class GetRestaurantSettingsQueryValidator : AbstractValidator<GetRestaurantSettingsQuery>
{
    public GetRestaurantSettingsQueryValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();
    }
}
