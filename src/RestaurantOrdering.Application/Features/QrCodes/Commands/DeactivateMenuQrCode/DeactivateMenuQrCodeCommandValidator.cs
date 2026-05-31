using FluentValidation;

namespace RestaurantOrdering.Application.Features.QrCodes.Commands.DeactivateMenuQrCode;

public sealed class DeactivateMenuQrCodeCommandValidator : AbstractValidator<DeactivateMenuQrCodeCommand>
{
    public DeactivateMenuQrCodeCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.QrCodeId)
            .NotEmpty();
    }
}
