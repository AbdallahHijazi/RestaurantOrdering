using FluentValidation;

namespace RestaurantOrdering.Application.Features.MediaFiles.Commands.SetRestaurantLogo;

public sealed class SetRestaurantLogoCommandValidator : AbstractValidator<SetRestaurantLogoCommand>
{
    public SetRestaurantLogoCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.MediaFileId)
            .NotEmpty();
    }
}
