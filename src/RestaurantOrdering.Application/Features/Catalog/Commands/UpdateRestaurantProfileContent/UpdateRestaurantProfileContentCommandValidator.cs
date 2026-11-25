using FluentValidation;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.UpdateRestaurantProfileContent;

public sealed class UpdateRestaurantProfileContentCommandValidator : AbstractValidator<UpdateRestaurantProfileContentCommand>
{
    public UpdateRestaurantProfileContentCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("Name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Description)
            .MaximumLength(500);

        RuleFor(x => x.Address)
            .MaximumLength(300);
    }
}
