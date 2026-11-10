using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SyncLocalSqlServer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TranslationJobs_AttemptCount",
                table: "TranslationJobs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TranslationJobs_MaxAttempts",
                table: "TranslationJobs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TranslationJobs_SourceLocaleCode",
                table: "TranslationJobs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TranslationJobs_SourceVersion",
                table: "TranslationJobs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TranslationJobs_TargetLocaleCode",
                table: "TranslationJobs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantUserPermissionGrants_Permission",
                table: "RestaurantUserPermissionGrants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_Address",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_Description",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_DraftContent",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_DraftSourceVersion",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_DraftStatus",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_LocaleCode",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_Name",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_PublishedSourceVersion",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSupportedLocales_LocaleCode",
                table: "RestaurantSupportedLocales");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSettings_DefaultLocale",
                table: "RestaurantSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSettings_DeliveryFee",
                table: "RestaurantSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSettings_MinimumOrderAmount",
                table: "RestaurantSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSettings_TaxRate",
                table: "RestaurantSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Restaurants_ContentVersion",
                table: "Restaurants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_QrCodes_QrType",
                table: "QrCodes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_DeliveryFee",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_DiscountAmount",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_OrderStatus",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_OrderType",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Subtotal",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_TaxAmount",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_TotalAmount",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItems_Quantity",
                table: "OrderItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItems_TotalPrice",
                table: "OrderItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItems_UnitPrice",
                table: "OrderItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_Description",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_DraftContent",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_DraftSourceVersion",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_DraftStatus",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_LocaleCode",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_Name",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_PublishedSourceVersion",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItems_ContentVersion",
                table: "MenuItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItems_DiscountPrice",
                table: "MenuItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItems_DiscountPrice_NotGreaterThanPrice",
                table: "MenuItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItems_Price",
                table: "MenuItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MediaFiles_FileSizeBytes",
                table: "MediaFiles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LocaleDefinitions_Code",
                table: "LocaleDefinitions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_Description",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_DraftContent",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_DraftSourceVersion",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_DraftStatus",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_LocaleCode",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_Name",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_PublishedSourceVersion",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Categories_ContentVersion",
                table: "Categories");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TranslationJobs_AttemptCount",
                table: "TranslationJobs",
                sql: "\"AttemptCount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TranslationJobs_MaxAttempts",
                table: "TranslationJobs",
                sql: "\"MaxAttempts\" >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TranslationJobs_SourceLocaleCode",
                table: "TranslationJobs",
                sql: "\"SourceLocaleCode\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TranslationJobs_SourceVersion",
                table: "TranslationJobs",
                sql: "\"SourceVersion\" >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TranslationJobs_TargetLocaleCode",
                table: "TranslationJobs",
                sql: "\"TargetLocaleCode\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantUserPermissionGrants_Permission",
                table: "RestaurantUserPermissionGrants",
                sql: "\"Permission\" >= 1 AND \"Permission\" <= 9");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_Address",
                table: "RestaurantTranslations",
                sql: "\"Address\" IS NULL OR \"Address\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_Description",
                table: "RestaurantTranslations",
                sql: "\"Description\" IS NULL OR \"Description\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_DraftContent",
                table: "RestaurantTranslations",
                sql: "\"DraftStatus\" IS NULL OR (\"DraftName\" IS NOT NULL OR \"DraftDescription\" IS NOT NULL OR \"DraftAddress\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_DraftSourceVersion",
                table: "RestaurantTranslations",
                sql: "\"DraftSourceVersion\" IS NULL OR \"DraftSourceVersion\" >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_DraftStatus",
                table: "RestaurantTranslations",
                sql: "\"DraftStatus\" IS NULL OR \"DraftStatus\" <> 3");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_LocaleCode",
                table: "RestaurantTranslations",
                sql: "\"LocaleCode\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_Name",
                table: "RestaurantTranslations",
                sql: "\"Name\" IS NULL OR \"Name\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_PublishedSourceVersion",
                table: "RestaurantTranslations",
                sql: "\"PublishedSourceVersion\" IS NULL OR \"PublishedSourceVersion\" >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSupportedLocales_LocaleCode",
                table: "RestaurantSupportedLocales",
                sql: "\"LocaleCode\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSettings_DefaultLocale",
                table: "RestaurantSettings",
                sql: "\"DefaultLocale\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSettings_DeliveryFee",
                table: "RestaurantSettings",
                sql: "\"DeliveryFee\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSettings_MinimumOrderAmount",
                table: "RestaurantSettings",
                sql: "\"MinimumOrderAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSettings_TaxRate",
                table: "RestaurantSettings",
                sql: "\"TaxRate\" >= 0 AND \"TaxRate\" <= 100");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Restaurants_ContentVersion",
                table: "Restaurants",
                sql: "\"ContentVersion\" >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_QrCodes_QrType",
                table: "QrCodes",
                sql: "\"QrType\" IN (1, 2)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_DeliveryFee",
                table: "Orders",
                sql: "\"DeliveryFee\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_DiscountAmount",
                table: "Orders",
                sql: "\"DiscountAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_OrderStatus",
                table: "Orders",
                sql: "\"OrderStatus\" IN (1, 2, 3, 4, 5)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_OrderType",
                table: "Orders",
                sql: "\"OrderType\" IN (1, 2, 3)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Subtotal",
                table: "Orders",
                sql: "\"Subtotal\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_TaxAmount",
                table: "Orders",
                sql: "\"TaxAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_TotalAmount",
                table: "Orders",
                sql: "\"TotalAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItems_Quantity",
                table: "OrderItems",
                sql: "\"Quantity\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItems_TotalPrice",
                table: "OrderItems",
                sql: "\"TotalPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItems_UnitPrice",
                table: "OrderItems",
                sql: "\"UnitPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_Description",
                table: "MenuItemTranslations",
                sql: "\"Description\" IS NULL OR \"Description\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_DraftContent",
                table: "MenuItemTranslations",
                sql: "\"DraftStatus\" IS NULL OR (\"DraftName\" IS NOT NULL OR \"DraftDescription\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_DraftSourceVersion",
                table: "MenuItemTranslations",
                sql: "\"DraftSourceVersion\" IS NULL OR \"DraftSourceVersion\" >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_DraftStatus",
                table: "MenuItemTranslations",
                sql: "\"DraftStatus\" IS NULL OR \"DraftStatus\" <> 3");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_LocaleCode",
                table: "MenuItemTranslations",
                sql: "\"LocaleCode\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_Name",
                table: "MenuItemTranslations",
                sql: "\"Name\" IS NULL OR \"Name\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_PublishedSourceVersion",
                table: "MenuItemTranslations",
                sql: "\"PublishedSourceVersion\" IS NULL OR \"PublishedSourceVersion\" >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItems_ContentVersion",
                table: "MenuItems",
                sql: "\"ContentVersion\" >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItems_DiscountPrice",
                table: "MenuItems",
                sql: "\"DiscountPrice\" IS NULL OR \"DiscountPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItems_DiscountPrice_NotGreaterThanPrice",
                table: "MenuItems",
                sql: "\"DiscountPrice\" IS NULL OR \"DiscountPrice\" <= \"Price\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItems_Price",
                table: "MenuItems",
                sql: "\"Price\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MediaFiles_FileSizeBytes",
                table: "MediaFiles",
                sql: "\"FileSizeBytes\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LocaleDefinitions_Code",
                table: "LocaleDefinitions",
                sql: "\"Code\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_Description",
                table: "CategoryTranslations",
                sql: "\"Description\" IS NULL OR \"Description\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_DraftContent",
                table: "CategoryTranslations",
                sql: "\"DraftStatus\" IS NULL OR (\"DraftName\" IS NOT NULL OR \"DraftDescription\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_DraftSourceVersion",
                table: "CategoryTranslations",
                sql: "\"DraftSourceVersion\" IS NULL OR \"DraftSourceVersion\" >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_DraftStatus",
                table: "CategoryTranslations",
                sql: "\"DraftStatus\" IS NULL OR \"DraftStatus\" <> 3");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_LocaleCode",
                table: "CategoryTranslations",
                sql: "\"LocaleCode\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_Name",
                table: "CategoryTranslations",
                sql: "\"Name\" IS NULL OR \"Name\" <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_PublishedSourceVersion",
                table: "CategoryTranslations",
                sql: "\"PublishedSourceVersion\" IS NULL OR \"PublishedSourceVersion\" >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Categories_ContentVersion",
                table: "Categories",
                sql: "\"ContentVersion\" >= 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TranslationJobs_AttemptCount",
                table: "TranslationJobs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TranslationJobs_MaxAttempts",
                table: "TranslationJobs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TranslationJobs_SourceLocaleCode",
                table: "TranslationJobs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TranslationJobs_SourceVersion",
                table: "TranslationJobs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TranslationJobs_TargetLocaleCode",
                table: "TranslationJobs");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantUserPermissionGrants_Permission",
                table: "RestaurantUserPermissionGrants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_Address",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_Description",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_DraftContent",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_DraftSourceVersion",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_DraftStatus",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_LocaleCode",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_Name",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantTranslations_PublishedSourceVersion",
                table: "RestaurantTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSupportedLocales_LocaleCode",
                table: "RestaurantSupportedLocales");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSettings_DefaultLocale",
                table: "RestaurantSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSettings_DeliveryFee",
                table: "RestaurantSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSettings_MinimumOrderAmount",
                table: "RestaurantSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSettings_TaxRate",
                table: "RestaurantSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Restaurants_ContentVersion",
                table: "Restaurants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_QrCodes_QrType",
                table: "QrCodes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_DeliveryFee",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_DiscountAmount",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_OrderStatus",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_OrderType",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Subtotal",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_TaxAmount",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_TotalAmount",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItems_Quantity",
                table: "OrderItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItems_TotalPrice",
                table: "OrderItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItems_UnitPrice",
                table: "OrderItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_Description",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_DraftContent",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_DraftSourceVersion",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_DraftStatus",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_LocaleCode",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_Name",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItemTranslations_PublishedSourceVersion",
                table: "MenuItemTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItems_ContentVersion",
                table: "MenuItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItems_DiscountPrice",
                table: "MenuItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItems_DiscountPrice_NotGreaterThanPrice",
                table: "MenuItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItems_Price",
                table: "MenuItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MediaFiles_FileSizeBytes",
                table: "MediaFiles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LocaleDefinitions_Code",
                table: "LocaleDefinitions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_Description",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_DraftContent",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_DraftSourceVersion",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_DraftStatus",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_LocaleCode",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_Name",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CategoryTranslations_PublishedSourceVersion",
                table: "CategoryTranslations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Categories_ContentVersion",
                table: "Categories");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TranslationJobs_AttemptCount",
                table: "TranslationJobs",
                sql: "[AttemptCount] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TranslationJobs_MaxAttempts",
                table: "TranslationJobs",
                sql: "[MaxAttempts] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TranslationJobs_SourceLocaleCode",
                table: "TranslationJobs",
                sql: "[SourceLocaleCode] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TranslationJobs_SourceVersion",
                table: "TranslationJobs",
                sql: "[SourceVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TranslationJobs_TargetLocaleCode",
                table: "TranslationJobs",
                sql: "[TargetLocaleCode] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantUserPermissionGrants_Permission",
                table: "RestaurantUserPermissionGrants",
                sql: "[Permission] >= 1 AND [Permission] <= 9");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_Address",
                table: "RestaurantTranslations",
                sql: "[Address] IS NULL OR [Address] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_Description",
                table: "RestaurantTranslations",
                sql: "[Description] IS NULL OR [Description] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_DraftContent",
                table: "RestaurantTranslations",
                sql: "[DraftStatus] IS NULL OR ([DraftName] IS NOT NULL OR [DraftDescription] IS NOT NULL OR [DraftAddress] IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_DraftSourceVersion",
                table: "RestaurantTranslations",
                sql: "[DraftSourceVersion] IS NULL OR [DraftSourceVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_DraftStatus",
                table: "RestaurantTranslations",
                sql: "[DraftStatus] IS NULL OR [DraftStatus] <> 3");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_LocaleCode",
                table: "RestaurantTranslations",
                sql: "[LocaleCode] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_Name",
                table: "RestaurantTranslations",
                sql: "[Name] IS NULL OR [Name] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantTranslations_PublishedSourceVersion",
                table: "RestaurantTranslations",
                sql: "[PublishedSourceVersion] IS NULL OR [PublishedSourceVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSupportedLocales_LocaleCode",
                table: "RestaurantSupportedLocales",
                sql: "[LocaleCode] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSettings_DefaultLocale",
                table: "RestaurantSettings",
                sql: "[DefaultLocale] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSettings_DeliveryFee",
                table: "RestaurantSettings",
                sql: "[DeliveryFee] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSettings_MinimumOrderAmount",
                table: "RestaurantSettings",
                sql: "[MinimumOrderAmount] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSettings_TaxRate",
                table: "RestaurantSettings",
                sql: "[TaxRate] >= 0 AND [TaxRate] <= 100");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Restaurants_ContentVersion",
                table: "Restaurants",
                sql: "[ContentVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_QrCodes_QrType",
                table: "QrCodes",
                sql: "[QrType] IN (1, 2)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_DeliveryFee",
                table: "Orders",
                sql: "[DeliveryFee] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_DiscountAmount",
                table: "Orders",
                sql: "[DiscountAmount] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_OrderStatus",
                table: "Orders",
                sql: "[OrderStatus] IN (1, 2, 3, 4, 5)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_OrderType",
                table: "Orders",
                sql: "[OrderType] IN (1, 2, 3)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Subtotal",
                table: "Orders",
                sql: "[Subtotal] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_TaxAmount",
                table: "Orders",
                sql: "[TaxAmount] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_TotalAmount",
                table: "Orders",
                sql: "[TotalAmount] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItems_Quantity",
                table: "OrderItems",
                sql: "[Quantity] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItems_TotalPrice",
                table: "OrderItems",
                sql: "[TotalPrice] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItems_UnitPrice",
                table: "OrderItems",
                sql: "[UnitPrice] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_Description",
                table: "MenuItemTranslations",
                sql: "[Description] IS NULL OR [Description] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_DraftContent",
                table: "MenuItemTranslations",
                sql: "[DraftStatus] IS NULL OR ([DraftName] IS NOT NULL OR [DraftDescription] IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_DraftSourceVersion",
                table: "MenuItemTranslations",
                sql: "[DraftSourceVersion] IS NULL OR [DraftSourceVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_DraftStatus",
                table: "MenuItemTranslations",
                sql: "[DraftStatus] IS NULL OR [DraftStatus] <> 3");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_LocaleCode",
                table: "MenuItemTranslations",
                sql: "[LocaleCode] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_Name",
                table: "MenuItemTranslations",
                sql: "[Name] IS NULL OR [Name] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItemTranslations_PublishedSourceVersion",
                table: "MenuItemTranslations",
                sql: "[PublishedSourceVersion] IS NULL OR [PublishedSourceVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItems_ContentVersion",
                table: "MenuItems",
                sql: "[ContentVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItems_DiscountPrice",
                table: "MenuItems",
                sql: "[DiscountPrice] IS NULL OR [DiscountPrice] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItems_DiscountPrice_NotGreaterThanPrice",
                table: "MenuItems",
                sql: "[DiscountPrice] IS NULL OR [DiscountPrice] <= [Price]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItems_Price",
                table: "MenuItems",
                sql: "[Price] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MediaFiles_FileSizeBytes",
                table: "MediaFiles",
                sql: "[FileSizeBytes] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LocaleDefinitions_Code",
                table: "LocaleDefinitions",
                sql: "[Code] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_Description",
                table: "CategoryTranslations",
                sql: "[Description] IS NULL OR [Description] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_DraftContent",
                table: "CategoryTranslations",
                sql: "[DraftStatus] IS NULL OR ([DraftName] IS NOT NULL OR [DraftDescription] IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_DraftSourceVersion",
                table: "CategoryTranslations",
                sql: "[DraftSourceVersion] IS NULL OR [DraftSourceVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_DraftStatus",
                table: "CategoryTranslations",
                sql: "[DraftStatus] IS NULL OR [DraftStatus] <> 3");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_LocaleCode",
                table: "CategoryTranslations",
                sql: "[LocaleCode] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_Name",
                table: "CategoryTranslations",
                sql: "[Name] IS NULL OR [Name] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CategoryTranslations_PublishedSourceVersion",
                table: "CategoryTranslations",
                sql: "[PublishedSourceVersion] IS NULL OR [PublishedSourceVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Categories_ContentVersion",
                table: "Categories",
                sql: "[ContentVersion] >= 1");
        }
    }
}
