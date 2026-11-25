using FluentValidation;

namespace RestaurantOrdering.Application.Features.Orders.Queries.GetDashboardSummary;

public sealed class GetDashboardSummaryQueryValidator : AbstractValidator<GetDashboardSummaryQuery>
{
    public GetDashboardSummaryQueryValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();
    }
}
