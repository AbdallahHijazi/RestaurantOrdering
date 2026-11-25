using FluentValidation;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.CreateCatalogCategory;

public sealed class CreateCatalogCategoryCommandValidator : AbstractValidator<CreateCatalogCategoryCommand>
{
    public CreateCatalogCategoryCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("Name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Description)
            .MaximumLength(300);

        RuleFor(x => x.DisplayOrder)
            .GreaterThanOrEqualTo(0);
    }
}
