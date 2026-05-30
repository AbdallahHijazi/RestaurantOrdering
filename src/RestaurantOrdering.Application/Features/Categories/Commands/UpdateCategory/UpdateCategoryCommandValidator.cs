using FluentValidation;

namespace RestaurantOrdering.Application.Features.Categories.Commands.UpdateCategory;

public sealed class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator()
    {
        RuleFor(x => x.CategoryId)
            .NotEmpty();

        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.NameAr)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.NameEn)
            .MaximumLength(100);

        RuleFor(x => x.DescriptionAr)
            .MaximumLength(300);

        RuleFor(x => x.DescriptionEn)
            .MaximumLength(300);

        RuleFor(x => x.DisplayOrder)
            .GreaterThanOrEqualTo(0);
    }
}
