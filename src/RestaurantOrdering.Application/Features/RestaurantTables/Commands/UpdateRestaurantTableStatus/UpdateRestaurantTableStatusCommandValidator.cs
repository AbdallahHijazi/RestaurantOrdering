using FluentValidation;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.UpdateRestaurantTableStatus;

public sealed class UpdateRestaurantTableStatusCommandValidator
    : AbstractValidator<UpdateRestaurantTableStatusCommand>
{
    public UpdateRestaurantTableStatusCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.TableId)
            .NotEmpty();
    }
}
