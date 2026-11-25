using FluentValidation;

namespace RestaurantOrdering.Application.Features.Translations.Commands.UpdateTranslationDraft;

public sealed class UpdateTranslationDraftCommandValidator : AbstractValidator<UpdateTranslationDraftCommand>
{
    public UpdateTranslationDraftCommandValidator()
    {
        RuleFor(command => command.RestaurantId).NotEmpty();
        RuleFor(command => command.TranslationId).NotEmpty();
        RuleFor(command => command.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("Name is required.")
            .MaximumLength(100);
        RuleFor(command => command.Description).MaximumLength(500);
        RuleFor(command => command.Address).MaximumLength(300);
    }
}
