using FluentValidation;

namespace RestaurantOrdering.Application.Features.RestaurantSettings.Commands.UpdateRestaurantSettings;

public sealed class UpdateRestaurantSettingsCommandValidator
    : AbstractValidator<UpdateRestaurantSettingsCommand>
{
    private const string CurrencyCodePattern = @"^[A-Za-z]{3}$";

    public UpdateRestaurantSettingsCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.CurrencyCode)
            .NotEmpty()
            .Length(3)
            .Matches(CurrencyCodePattern);

        RuleFor(x => x.TimeZone)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.TaxRate)
            .InclusiveBetween(0m, 100m);

        RuleFor(x => x.DeliveryFee)
            .GreaterThanOrEqualTo(0m);

        RuleFor(x => x.MinimumOrderAmount)
            .GreaterThanOrEqualTo(0m);

        RuleFor(x => x.WorkingHoursJson)
            .MaximumLength(8000)
            .When(x => x.WorkingHoursJson is not null);
    }
}
