using FluentValidation;

namespace RestaurantOrdering.Application.Features.QrCodes.Queries.GetMenuQrCodes;

public sealed class GetMenuQrCodesQueryValidator : AbstractValidator<GetMenuQrCodesQuery>
{
    public GetMenuQrCodesQueryValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();
    }
}
