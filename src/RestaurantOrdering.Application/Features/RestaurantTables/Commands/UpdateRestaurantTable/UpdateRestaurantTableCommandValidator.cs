using FluentValidation;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.UpdateRestaurantTable;

public sealed class UpdateRestaurantTableCommandValidator : AbstractValidator<UpdateRestaurantTableCommand>
{
    public UpdateRestaurantTableCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.TableId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .NotEmpty()
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("Table name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Zone)
            .MaximumLength(100)
            .When(x => !string.IsNullOrWhiteSpace(x.Zone));
    }
}
