using FluentValidation;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.SetRestaurantUserActive;

public sealed class SetRestaurantUserActiveCommandValidator : AbstractValidator<SetRestaurantUserActiveCommand>
{
    public SetRestaurantUserActiveCommandValidator()
    {
        RuleFor(command => command.RestaurantId).NotEmpty();
        RuleFor(command => command.UserId).NotEmpty();
    }
}
