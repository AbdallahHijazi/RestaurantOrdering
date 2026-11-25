using FluentValidation;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.CreateCatalogMenuItem;

public sealed class CreateCatalogMenuItemCommandValidator : AbstractValidator<CreateCatalogMenuItemCommand>
{
    public CreateCatalogMenuItemCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.CategoryId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("Name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Description)
            .MaximumLength(300);

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.DiscountPrice)
            .GreaterThanOrEqualTo(0)
            .When(x => x.DiscountPrice.HasValue);

        RuleFor(x => x.DisplayOrder)
            .GreaterThanOrEqualTo(0);
    }
}
