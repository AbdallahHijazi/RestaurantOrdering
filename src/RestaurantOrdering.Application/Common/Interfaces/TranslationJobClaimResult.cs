namespace RestaurantOrdering.Application.Common.Interfaces;

public sealed record TranslationJobClaimResult(Guid JobId, string WorkerId);
