using FluentValidation;

namespace RestaurantOrdering.Application.Features.MenuItems.Queries.GetMenuItemById;

public sealed class GetMenuItemByIdQueryValidator : AbstractValidator<GetMenuItemByIdQuery>
{
    public GetMenuItemByIdQueryValidator()
    {
        RuleFor(x => x.MenuItemId)
            .NotEmpty();

        RuleFor(x => x.RestaurantId)
            .NotEmpty();
    }
}
