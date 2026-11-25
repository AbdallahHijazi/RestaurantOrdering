using FluentValidation;
using RestaurantOrdering.Application.Common.Security;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.CreateRestaurantUser;

public sealed class CreateRestaurantUserCommandValidator : AbstractValidator<CreateRestaurantUserCommand>
{
    public CreateRestaurantUserCommandValidator()
    {
        RuleFor(command => command.RestaurantId)
            .NotEmpty();

        RuleFor(command => command.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        RuleFor(command => command.Password)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(command => command.FullName)
            .MaximumLength(150)
            .When(command => !string.IsNullOrWhiteSpace(command.FullName));

        RuleFor(command => command.PhoneNumber)
            .MaximumLength(32)
            .When(command => !string.IsNullOrWhiteSpace(command.PhoneNumber));

        RuleFor(command => command.Role)
            .NotEmpty()
            .Must(AssignableRestaurantStaffRoles.IsAllowed)
            .WithMessage("Role must be RestaurantManager or KitchenManager.");
    }
}
