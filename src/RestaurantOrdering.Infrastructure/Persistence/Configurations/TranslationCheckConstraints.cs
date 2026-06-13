namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

internal static class TranslationCheckConstraints
{
    internal const string LocaleCodeNotEmpty = "[LocaleCode] <> ''";

    internal const string PublishedNameNotBlank =
        "[Name] IS NULL OR [Name] <> ''";

    internal const string PublishedDescriptionNotBlank =
        "[Description] IS NULL OR [Description] <> ''";

    internal const string PublishedAddressNotBlank =
        "[Address] IS NULL OR [Address] <> ''";

    internal const string PublishedSourceVersionValid =
        "[PublishedSourceVersion] IS NULL OR [PublishedSourceVersion] >= 1";

    internal const string DraftSourceVersionValid =
        "[DraftSourceVersion] IS NULL OR [DraftSourceVersion] >= 1";

    internal const string DraftStatusNotApproved =
        "[DraftStatus] IS NULL OR [DraftStatus] <> 3";

    internal const string DraftContentRequiredWhenDraftStatusSet =
        "[DraftStatus] IS NULL OR ([DraftName] IS NOT NULL OR [DraftDescription] IS NOT NULL)";

    internal const string RestaurantDraftContentRequiredWhenDraftStatusSet =
        "[DraftStatus] IS NULL OR ([DraftName] IS NOT NULL OR [DraftDescription] IS NOT NULL OR [DraftAddress] IS NOT NULL)";
}
