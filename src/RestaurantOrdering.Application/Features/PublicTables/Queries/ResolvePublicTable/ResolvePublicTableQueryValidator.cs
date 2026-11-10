using FluentValidation;

namespace RestaurantOrdering.Application.Features.PublicTables.Queries.ResolvePublicTable;

public sealed class ResolvePublicTableQueryValidator : AbstractValidator<ResolvePublicTableQuery>
{
    public ResolvePublicTableQueryValidator()
    {
        RuleFor(x => x.RestaurantSlug)
            .NotEmpty()
            .Must(slug => !string.IsNullOrWhiteSpace(slug))
            .WithMessage("Restaurant slug is required.")
            .MaximumLength(150);

        RuleFor(x => x.Token)
            .NotEmpty()
            .Must(token => !string.IsNullOrWhiteSpace(token))
            .WithMessage("Table token is required.")
            .MaximumLength(32);
    }
}
