using FluentValidation;

namespace RestaurantOrdering.Application.Features.MenuItems.Queries.GetMenuItems;

public sealed class GetMenuItemsQueryValidator : AbstractValidator<GetMenuItemsQuery>
{
    public GetMenuItemsQueryValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.CategoryId)
            .NotEqual(Guid.Empty)
            .When(x => x.CategoryId.HasValue);
    }
}
