using FluentValidation;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.UpdateCatalogMenuItem;

public sealed class UpdateCatalogMenuItemCommandValidator : AbstractValidator<UpdateCatalogMenuItemCommand>
{
    public UpdateCatalogMenuItemCommandValidator()
    {
        RuleFor(x => x.MenuItemId)
            .NotEmpty();

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
