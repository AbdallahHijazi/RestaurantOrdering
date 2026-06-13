using FluentValidation;

namespace RestaurantOrdering.Application.Features.Translations.Commands.BulkApproveTranslations;

public sealed class BulkApproveTranslationsCommandValidator : AbstractValidator<BulkApproveTranslationsCommand>
{
    public BulkApproveTranslationsCommandValidator()
    {
        RuleFor(command => command.RestaurantId).NotEmpty();
        RuleFor(command => command.TranslationIds).NotEmpty();
        RuleFor(command => command.TranslationIds.Count)
            .LessThanOrEqualTo(100)
            .WithMessage("Bulk approve supports at most 100 translation IDs.");
        RuleFor(command => command.TranslationIds)
            .Must(ids => ids.Distinct().Count() == ids.Count)
            .WithMessage("Duplicate translation IDs are not allowed.");
    }
}
