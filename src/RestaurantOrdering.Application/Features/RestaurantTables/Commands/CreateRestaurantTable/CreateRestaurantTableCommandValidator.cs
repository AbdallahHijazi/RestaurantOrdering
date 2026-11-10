using FluentValidation;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.CreateRestaurantTable;

public sealed class CreateRestaurantTableCommandValidator : AbstractValidator<CreateRestaurantTableCommand>
{
    public CreateRestaurantTableCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
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
