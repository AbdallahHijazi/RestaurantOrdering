using FluentValidation;

namespace RestaurantOrdering.Application.Features.MenuItems.Commands.DeleteMenuItem;

public sealed class DeleteMenuItemCommandValidator : AbstractValidator<DeleteMenuItemCommand>
{
    public DeleteMenuItemCommandValidator()
    {
        RuleFor(x => x.MenuItemId)
            .NotEmpty();

        RuleFor(x => x.RestaurantId)
            .NotEmpty();
    }
}
