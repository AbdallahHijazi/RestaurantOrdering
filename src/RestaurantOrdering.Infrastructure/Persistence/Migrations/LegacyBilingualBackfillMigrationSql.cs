namespace RestaurantOrdering.Infrastructure.Persistence.Migrations;

internal static class LegacyBilingualBackfillMigrationSql
{
    internal const string BackfillRestaurantSettings = """
        INSERT INTO [RestaurantSettings] (
            [Id], [RestaurantId], [DefaultLocale], [TranslationMode], [CurrencyCode], [TimeZone],
            [TaxRate], [DeliveryFee], [MinimumOrderAmount], [IsDeliveryEnabled], [IsPickupEnabled], [CreatedAt])
        SELECT
            NEWID(), r.[Id], N'ar', CAST(2 AS tinyint), N'USD', N'UTC',
            0, 0, 0, 1, 1, SYSUTCDATETIME()
        FROM [Restaurants] r
        WHERE r.[IsDeleted] = 0
          AND NOT EXISTS (
              SELECT 1 FROM [RestaurantSettings] rs WHERE rs.[RestaurantId] = r.[Id]);

        UPDATE rs
        SET [DefaultLocale] = N'ar'
        FROM [RestaurantSettings] rs
        INNER JOIN [Restaurants] r ON r.[Id] = rs.[RestaurantId]
        WHERE r.[IsDeleted] = 0
          AND (rs.[DefaultLocale] IS NULL OR LTRIM(RTRIM(rs.[DefaultLocale])) = N'');

        UPDATE rs
        SET [TranslationMode] = CAST(2 AS tinyint)
        FROM [RestaurantSettings] rs
        INNER JOIN [Restaurants] r ON r.[Id] = rs.[RestaurantId]
        WHERE r.[IsDeleted] = 0
          AND rs.[TranslationMode] = CAST(0 AS tinyint);
        """;

    internal const string BackfillRestaurantSupportedLocales = """
        INSERT INTO [RestaurantSupportedLocales] (
            [Id], [RestaurantId], [LocaleCode], [IsEnabled], [SortOrder], [CreatedAt])
        SELECT NEWID(), r.[Id], N'ar', 1, 1, SYSUTCDATETIME()
        FROM [Restaurants] r
        WHERE r.[IsDeleted] = 0
          AND NOT EXISTS (
              SELECT 1 FROM [RestaurantSupportedLocales] s
              WHERE s.[RestaurantId] = r.[Id] AND s.[LocaleCode] = N'ar');

        INSERT INTO [RestaurantSupportedLocales] (
            [Id], [RestaurantId], [LocaleCode], [IsEnabled], [SortOrder], [CreatedAt])
        SELECT NEWID(), r.[Id], N'en', 1, 2, SYSUTCDATETIME()
        FROM [Restaurants] r
        WHERE r.[IsDeleted] = 0
          AND NOT EXISTS (
              SELECT 1 FROM [RestaurantSupportedLocales] s
              WHERE s.[RestaurantId] = r.[Id] AND s.[LocaleCode] = N'en');
        """;

    internal const string BackfillRestaurantTranslations = """
        INSERT INTO [RestaurantTranslations] (
            [Id], [RestaurantId], [LocaleCode], [Name], [Description], [Address],
            [PublishedSource], [PublishedSourceVersion], [CreatedAt])
        SELECT
            NEWID(), r.[Id], N'ar', r.[NameAr], r.[DescriptionAr], r.[AddressAr],
            CAST(1 AS tinyint), r.[ContentVersion], SYSUTCDATETIME()
        FROM [Restaurants] r
        WHERE r.[IsDeleted] = 0
          AND r.[NameAr] IS NOT NULL
          AND LTRIM(RTRIM(r.[NameAr])) <> N''
          AND NOT EXISTS (
              SELECT 1 FROM [RestaurantTranslations] t
              WHERE t.[RestaurantId] = r.[Id] AND t.[LocaleCode] = N'ar');

        INSERT INTO [RestaurantTranslations] (
            [Id], [RestaurantId], [LocaleCode], [Name], [Description], [Address],
            [PublishedSource], [PublishedSourceVersion], [CreatedAt])
        SELECT
            NEWID(), r.[Id], N'en', r.[NameEn], r.[DescriptionEn], r.[AddressEn],
            CAST(3 AS tinyint), r.[ContentVersion], SYSUTCDATETIME()
        FROM [Restaurants] r
        WHERE r.[IsDeleted] = 0
          AND r.[NameEn] IS NOT NULL
          AND LTRIM(RTRIM(r.[NameEn])) <> N''
          AND NOT EXISTS (
              SELECT 1 FROM [RestaurantTranslations] t
              WHERE t.[RestaurantId] = r.[Id] AND t.[LocaleCode] = N'en');
        """;

    internal const string BackfillCategoryTranslations = """
        INSERT INTO [CategoryTranslations] (
            [Id], [CategoryId], [LocaleCode], [Name], [Description],
            [PublishedSource], [PublishedSourceVersion], [CreatedAt])
        SELECT
            NEWID(), c.[Id], N'ar', c.[NameAr], c.[DescriptionAr],
            CAST(1 AS tinyint), c.[ContentVersion], SYSUTCDATETIME()
        FROM [Categories] c
        WHERE c.[IsDeleted] = 0
          AND c.[NameAr] IS NOT NULL
          AND LTRIM(RTRIM(c.[NameAr])) <> N''
          AND NOT EXISTS (
              SELECT 1 FROM [CategoryTranslations] t
              WHERE t.[CategoryId] = c.[Id] AND t.[LocaleCode] = N'ar');

        INSERT INTO [CategoryTranslations] (
            [Id], [CategoryId], [LocaleCode], [Name], [Description],
            [PublishedSource], [PublishedSourceVersion], [CreatedAt])
        SELECT
            NEWID(), c.[Id], N'en', c.[NameEn], c.[DescriptionEn],
            CAST(3 AS tinyint), c.[ContentVersion], SYSUTCDATETIME()
        FROM [Categories] c
        WHERE c.[IsDeleted] = 0
          AND c.[NameEn] IS NOT NULL
          AND LTRIM(RTRIM(c.[NameEn])) <> N''
          AND NOT EXISTS (
              SELECT 1 FROM [CategoryTranslations] t
              WHERE t.[CategoryId] = c.[Id] AND t.[LocaleCode] = N'en');
        """;

    internal const string BackfillMenuItemTranslations = """
        INSERT INTO [MenuItemTranslations] (
            [Id], [MenuItemId], [LocaleCode], [Name], [Description],
            [PublishedSource], [PublishedSourceVersion], [CreatedAt])
        SELECT
            NEWID(), m.[Id], N'ar', m.[NameAr], m.[DescriptionAr],
            CAST(1 AS tinyint), m.[ContentVersion], SYSUTCDATETIME()
        FROM [MenuItems] m
        WHERE m.[IsDeleted] = 0
          AND m.[NameAr] IS NOT NULL
          AND LTRIM(RTRIM(m.[NameAr])) <> N''
          AND NOT EXISTS (
              SELECT 1 FROM [MenuItemTranslations] t
              WHERE t.[MenuItemId] = m.[Id] AND t.[LocaleCode] = N'ar');

        INSERT INTO [MenuItemTranslations] (
            [Id], [MenuItemId], [LocaleCode], [Name], [Description],
            [PublishedSource], [PublishedSourceVersion], [CreatedAt])
        SELECT
            NEWID(), m.[Id], N'en', m.[NameEn], m.[DescriptionEn],
            CAST(3 AS tinyint), m.[ContentVersion], SYSUTCDATETIME()
        FROM [MenuItems] m
        WHERE m.[IsDeleted] = 0
          AND m.[NameEn] IS NOT NULL
          AND LTRIM(RTRIM(m.[NameEn])) <> N''
          AND NOT EXISTS (
              SELECT 1 FROM [MenuItemTranslations] t
              WHERE t.[MenuItemId] = m.[Id] AND t.[LocaleCode] = N'en');
        """;

    internal static IReadOnlyList<string> AllBackfillStatements { get; } =
    [
        BackfillRestaurantSettings,
        BackfillRestaurantSupportedLocales,
        BackfillRestaurantTranslations,
        BackfillCategoryTranslations,
        BackfillMenuItemTranslations
    ];
}
