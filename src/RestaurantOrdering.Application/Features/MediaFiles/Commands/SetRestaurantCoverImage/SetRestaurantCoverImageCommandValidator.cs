using FluentValidation;

namespace RestaurantOrdering.Application.Features.MediaFiles.Commands.SetRestaurantCoverImage;

public sealed class SetRestaurantCoverImageCommandValidator : AbstractValidator<SetRestaurantCoverImageCommand>
{
    public SetRestaurantCoverImageCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.MediaFileId)
            .NotEmpty();
    }
}
