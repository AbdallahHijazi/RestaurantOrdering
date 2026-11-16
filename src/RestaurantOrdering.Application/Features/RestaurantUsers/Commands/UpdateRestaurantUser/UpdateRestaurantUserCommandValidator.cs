using FluentValidation;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.UpdateRestaurantUser;

public sealed class UpdateRestaurantUserCommandValidator : AbstractValidator<UpdateRestaurantUserCommand>
{
    public UpdateRestaurantUserCommandValidator()
    {
        RuleFor(command => command.RestaurantId).NotEmpty();
        RuleFor(command => command.UserId).NotEmpty();

        RuleFor(command => command.FullName)
            .MaximumLength(150)
            .When(command => !string.IsNullOrWhiteSpace(command.FullName));

        RuleFor(command => command.PhoneNumber)
            .MaximumLength(32)
            .When(command => !string.IsNullOrWhiteSpace(command.PhoneNumber));
    }
}
