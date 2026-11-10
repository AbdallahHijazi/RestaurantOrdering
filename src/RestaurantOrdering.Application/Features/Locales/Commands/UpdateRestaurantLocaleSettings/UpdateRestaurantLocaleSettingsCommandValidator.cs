using FluentValidation;

namespace RestaurantOrdering.Application.Features.Locales.Commands.UpdateRestaurantLocaleSettings;

public sealed class UpdateRestaurantLocaleSettingsCommandValidator
    : AbstractValidator<UpdateRestaurantLocaleSettingsCommand>
{
    public UpdateRestaurantLocaleSettingsCommandValidator()
    {
        RuleFor(command => command.DefaultLocale)
            .NotEmpty()
            .MaximumLength(20);

        RuleFor(command => command.TranslationMode)
            .NotEmpty();

        RuleFor(command => command.SupportedLocales)
            .NotNull();

        RuleForEach(command => command.SupportedLocales).ChildRules(locale =>
        {
            locale.RuleFor(item => item.Code)
                .NotEmpty()
                .MaximumLength(20);

            locale.RuleFor(item => item.SortOrder)
                .GreaterThanOrEqualTo(0);
        });
    }
}
