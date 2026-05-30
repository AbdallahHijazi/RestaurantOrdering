using FluentValidation;
using RestaurantOrdering.Application.Features.Restaurants.Common;

namespace RestaurantOrdering.Application.Features.Restaurants.Commands.UpdateRestaurant;

public sealed class UpdateRestaurantCommandValidator : AbstractValidator<UpdateRestaurantCommand>
{
    private const string SlugPattern = @"^[a-z0-9]+(?:-[a-z0-9]+)*$";

    public UpdateRestaurantCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.Slug)
            .NotEmpty()
            .MaximumLength(150)
            .Must(slug => SlugPatternRegex.IsMatch(SlugNormalizer.Normalize(slug)))
            .WithMessage("Slug must contain only lowercase letters, numbers, and hyphens.");

        RuleFor(x => x.NameAr)
            .NotEmpty()
            .MaximumLength(150);

        RuleFor(x => x.NameEn)
            .MaximumLength(150);

        RuleFor(x => x.DescriptionAr)
            .MaximumLength(500);

        RuleFor(x => x.DescriptionEn)
            .MaximumLength(500);

        RuleFor(x => x.PhoneNumber)
            .NotEmpty()
            .MaximumLength(20);

        RuleFor(x => x.WhatsAppNumber)
            .MaximumLength(20);

        RuleFor(x => x.AddressAr)
            .MaximumLength(300);

        RuleFor(x => x.AddressEn)
            .MaximumLength(300);

        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90m, 90m)
            .When(x => x.Latitude.HasValue);

        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180m, 180m)
            .When(x => x.Longitude.HasValue);
    }

    private static readonly System.Text.RegularExpressions.Regex SlugPatternRegex =
        new(@"^[a-z0-9]+(?:-[a-z0-9]+)*$", System.Text.RegularExpressions.RegexOptions.Compiled);
}
