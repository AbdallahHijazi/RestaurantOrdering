using FluentValidation;

namespace RestaurantOrdering.Application.Features.MediaFiles.Commands.UploadMediaFile;

public sealed class UploadMediaFileCommandValidator : AbstractValidator<UploadMediaFileCommand>
{
    public UploadMediaFileCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.Content)
            .NotNull();

        RuleFor(x => x.OriginalFileName)
            .NotEmpty()
            .Must(fileName => !string.IsNullOrWhiteSpace(fileName))
            .WithMessage("Original file name is required.")
            .MaximumLength(255);

        RuleFor(x => x.ContentType)
            .NotEmpty()
            .Must(contentType => !string.IsNullOrWhiteSpace(contentType))
            .WithMessage("Content type is required.")
            .MaximumLength(100);

        RuleFor(x => x.DeclaredFileSizeBytes)
            .GreaterThan(0);
    }
}
