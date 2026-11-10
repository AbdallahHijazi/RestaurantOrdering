using FluentValidation;
using RestaurantOrdering.Application.Features.Restaurants.Common;

namespace RestaurantOrdering.Application.Features.Auth.Commands.RegisterRestaurantOwner;

public sealed class RegisterRestaurantOwnerCommandValidator : AbstractValidator<RegisterRestaurantOwnerCommand>
{
    private static readonly System.Text.RegularExpressions.Regex SlugPatternRegex =
        new(@"^[a-z0-9]+(?:-[a-z0-9]+)*$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public RegisterRestaurantOwnerCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        RuleFor(x => x.Password)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(20);

        RuleFor(x => x.RestaurantNameAr)
            .NotEmpty()
            .MaximumLength(150);

        RuleFor(x => x.RestaurantNameEn)
            .MaximumLength(150);

        RuleFor(x => x.Slug)
            .NotEmpty()
            .MaximumLength(150)
            .Must(slug => !string.IsNullOrWhiteSpace(SlugNormalizer.Normalize(slug)))
            .WithMessage("Slug is required.")
            .Must(slug => SlugPatternRegex.IsMatch(SlugNormalizer.Normalize(slug)))
            .WithMessage("Slug must contain only lowercase letters, numbers, and hyphens.");
    }
}
