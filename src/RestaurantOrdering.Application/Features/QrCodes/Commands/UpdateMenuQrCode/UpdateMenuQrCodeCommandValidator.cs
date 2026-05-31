using FluentValidation;
using RestaurantOrdering.Application.Features.QrCodes.Common;

namespace RestaurantOrdering.Application.Features.QrCodes.Commands.UpdateMenuQrCode;

public sealed class UpdateMenuQrCodeCommandValidator : AbstractValidator<UpdateMenuQrCodeCommand>
{
    public UpdateMenuQrCodeCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.QrCodeId)
            .NotEmpty();

        RuleFor(x => x.TargetUrl)
            .NotEmpty()
            .Must(url => !string.IsNullOrWhiteSpace(url))
            .WithMessage("Target URL is required.")
            .MaximumLength(500)
            .Must(QrCodeTargetUrlRules.IsValidAbsoluteHttpOrHttpsUrl)
            .WithMessage("Target URL must be a valid absolute http or https URL.");
    }
}
