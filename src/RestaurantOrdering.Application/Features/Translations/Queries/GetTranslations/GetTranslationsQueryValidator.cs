using FluentValidation;

namespace RestaurantOrdering.Application.Features.Translations.Queries.GetTranslations;

public sealed class GetTranslationsQueryValidator : AbstractValidator<GetTranslationsQuery>
{
    public GetTranslationsQueryValidator()
    {
        RuleFor(query => query.RestaurantId).NotEmpty();
        RuleFor(query => query.Page).GreaterThanOrEqualTo(1);
        RuleFor(query => query.PageSize).InclusiveBetween(1, 100);
    }
}
