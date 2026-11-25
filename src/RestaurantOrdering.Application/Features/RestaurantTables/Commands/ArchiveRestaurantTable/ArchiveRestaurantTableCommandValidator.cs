using FluentValidation;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.ArchiveRestaurantTable;

public sealed class ArchiveRestaurantTableCommandValidator : AbstractValidator<ArchiveRestaurantTableCommand>
{
    public ArchiveRestaurantTableCommandValidator()
    {
        RuleFor(x => x.RestaurantId).NotEmpty();
        RuleFor(x => x.TableId).NotEmpty();
    }
}
