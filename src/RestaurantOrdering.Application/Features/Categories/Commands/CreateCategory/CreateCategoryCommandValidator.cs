using FluentValidation;

namespace RestaurantOrdering.Application.Features.Categories.Commands.CreateCategory;

public sealed class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
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
