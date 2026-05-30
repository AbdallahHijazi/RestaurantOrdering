using FluentValidation;

namespace RestaurantOrdering.Application.Features.MenuItems.Commands.CreateMenuItem;

public sealed class CreateMenuItemCommandValidator : AbstractValidator<CreateMenuItemCommand>
{
    public CreateMenuItemCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.CategoryId)
            .NotEmpty();

        RuleFor(x => x.ImageFileId)
            .NotEqual(Guid.Empty)
            .When(x => x.ImageFileId.HasValue);

        RuleFor(x => x.NameAr)
            .NotEmpty()
            .MaximumLength(150);

        RuleFor(x => x.NameEn)
            .MaximumLength(150);

        RuleFor(x => x.DescriptionAr)
            .MaximumLength(500);

        RuleFor(x => x.DescriptionEn)
            .MaximumLength(500);

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0m);

        RuleFor(x => x.DiscountPrice)
            .GreaterThanOrEqualTo(0m)
            .When(x => x.DiscountPrice.HasValue);

        RuleFor(x => x.DisplayOrder)
            .GreaterThanOrEqualTo(0);
    }
}
