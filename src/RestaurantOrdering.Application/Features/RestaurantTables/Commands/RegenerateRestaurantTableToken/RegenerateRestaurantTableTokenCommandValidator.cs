using FluentValidation;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.RegenerateRestaurantTableToken;

public sealed class RegenerateRestaurantTableTokenCommandValidator
    : AbstractValidator<RegenerateRestaurantTableTokenCommand>
{
    public RegenerateRestaurantTableTokenCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.TableId)
            .NotEmpty();
    }
}
