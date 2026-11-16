using FluentValidation;

namespace RestaurantOrdering.Application.Features.Orders.Queries.GetDashboardActivity;

public sealed class GetDashboardActivityQueryValidator : AbstractValidator<GetDashboardActivityQuery>
{
    public GetDashboardActivityQueryValidator()
    {
        RuleFor(x => x.RestaurantId).NotEmpty();
        RuleFor(x => x.Days).InclusiveBetween(1, 31);
    }
}
