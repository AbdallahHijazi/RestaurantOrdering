using FluentValidation;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.UpdateCatalogCategory;

public sealed class UpdateCatalogCategoryCommandValidator : AbstractValidator<UpdateCatalogCategoryCommand>
{
    public UpdateCatalogCategoryCommandValidator()
    {
        RuleFor(x => x.CategoryId)
            .NotEmpty();

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
