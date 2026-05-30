using FluentValidation;

namespace RestaurantOrdering.Application.Features.PublicMenu.Queries.GetPublicMenuBySlug;

public sealed class GetPublicMenuBySlugQueryValidator : AbstractValidator<GetPublicMenuBySlugQuery>
{
    public GetPublicMenuBySlugQueryValidator()
    {
        RuleFor(x => x.RestaurantSlug)
            .NotEmpty()
            .Must(slug => !string.IsNullOrWhiteSpace(slug))
            .WithMessage("Restaurant slug is required.")
            .MaximumLength(150);
    }
}
