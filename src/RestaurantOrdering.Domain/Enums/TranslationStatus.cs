namespace RestaurantOrdering.Domain.Enums;

public enum TranslationStatus : byte
{
    Pending = 1,
    NeedsReview = 2,
    Approved = 3,
    Failed = 4
}
