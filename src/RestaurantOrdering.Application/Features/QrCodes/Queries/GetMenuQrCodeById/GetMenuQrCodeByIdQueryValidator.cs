using FluentValidation;

namespace RestaurantOrdering.Application.Features.QrCodes.Queries.GetMenuQrCodeById;

public sealed class GetMenuQrCodeByIdQueryValidator : AbstractValidator<GetMenuQrCodeByIdQuery>
{
    public GetMenuQrCodeByIdQueryValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.QrCodeId)
            .NotEmpty();
    }
}
