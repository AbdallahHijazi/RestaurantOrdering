using FluentValidation;
using RestaurantOrdering.Application.Common.Security;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.UpdateRestaurantUserRole;

public sealed class UpdateRestaurantUserRoleCommandValidator : AbstractValidator<UpdateRestaurantUserRoleCommand>
{
    public UpdateRestaurantUserRoleCommandValidator()
    {
        RuleFor(command => command.RestaurantId)
            .NotEmpty();

        RuleFor(command => command.UserId)
            .NotEmpty();

        RuleFor(command => command.Role)
            .NotEmpty()
            .Must(AssignableRestaurantStaffRoles.IsAllowed)
            .WithMessage("Role must be RestaurantManager or KitchenManager.");
    }
}
