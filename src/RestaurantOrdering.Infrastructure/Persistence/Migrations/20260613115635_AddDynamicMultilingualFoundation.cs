using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDynamicMultilingualFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultLocale",
                table: "RestaurantSettings",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ar");

            migrationBuilder.AddColumn<byte>(
                name: "TranslationMode",
                table: "RestaurantSettings",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)2);

            migrationBuilder.AddColumn<int>(
                name: "ContentVersion",
                table: "Restaurants",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "ContentVersion",
                table: "MenuItems",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "ContentVersion",
                table: "Categories",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "LocaleDefinitions",
                columns: table => new
                {
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NativeName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Direction = table.Column<byte>(type: "tinyint", nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocaleDefinitions", x => x.Code);
                    table.CheckConstraint("CK_LocaleDefinitions_Code", "[Code] <> ''");
                });

            migrationBuilder.CreateTable(
                name: "TranslationAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EventType = table.Column<byte>(type: "tinyint", nullable: false),
                    EntityType = table.Column<byte>(type: "tinyint", nullable: true),
                    EntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LocaleCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TranslationAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TranslationAuditLogs_AspNetUsers_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TranslationAuditLogs_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CategoryTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LocaleCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PublishedSource = table.Column<byte>(type: "tinyint", nullable: true),
                    PublishedSourceVersion = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DraftName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DraftDescription = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DraftStatus = table.Column<byte>(type: "tinyint", nullable: true),
                    DraftSource = table.Column<byte>(type: "tinyint", nullable: true),
                    DraftSourceVersion = table.Column<int>(type: "int", nullable: true),
                    DraftGeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DraftLastError = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoryTranslations", x => x.Id);
                    table.CheckConstraint("CK_CategoryTranslations_Description", "[Description] IS NULL OR [Description] <> ''");
                    table.CheckConstraint("CK_CategoryTranslations_DraftContent", "[DraftStatus] IS NULL OR ([DraftName] IS NOT NULL OR [DraftDescription] IS NOT NULL)");
                    table.CheckConstraint("CK_CategoryTranslations_DraftSourceVersion", "[DraftSourceVersion] IS NULL OR [DraftSourceVersion] >= 1");
                    table.CheckConstraint("CK_CategoryTranslations_DraftStatus", "[DraftStatus] IS NULL OR [DraftStatus] <> 3");
                    table.CheckConstraint("CK_CategoryTranslations_LocaleCode", "[LocaleCode] <> ''");
                    table.CheckConstraint("CK_CategoryTranslations_Name", "[Name] IS NULL OR [Name] <> ''");
                    table.CheckConstraint("CK_CategoryTranslations_PublishedSourceVersion", "[PublishedSourceVersion] IS NULL OR [PublishedSourceVersion] >= 1");
                    table.ForeignKey(
                        name: "FK_CategoryTranslations_AspNetUsers_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CategoryTranslations_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CategoryTranslations_LocaleDefinitions_LocaleCode",
                        column: x => x.LocaleCode,
                        principalTable: "LocaleDefinitions",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MenuItemTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MenuItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LocaleCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PublishedSource = table.Column<byte>(type: "tinyint", nullable: true),
                    PublishedSourceVersion = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DraftName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DraftDescription = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DraftStatus = table.Column<byte>(type: "tinyint", nullable: true),
                    DraftSource = table.Column<byte>(type: "tinyint", nullable: true),
                    DraftSourceVersion = table.Column<int>(type: "int", nullable: true),
                    DraftGeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DraftLastError = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenuItemTranslations", x => x.Id);
                    table.CheckConstraint("CK_MenuItemTranslations_Description", "[Description] IS NULL OR [Description] <> ''");
                    table.CheckConstraint("CK_MenuItemTranslations_DraftContent", "[DraftStatus] IS NULL OR ([DraftName] IS NOT NULL OR [DraftDescription] IS NOT NULL)");
                    table.CheckConstraint("CK_MenuItemTranslations_DraftSourceVersion", "[DraftSourceVersion] IS NULL OR [DraftSourceVersion] >= 1");
                    table.CheckConstraint("CK_MenuItemTranslations_DraftStatus", "[DraftStatus] IS NULL OR [DraftStatus] <> 3");
                    table.CheckConstraint("CK_MenuItemTranslations_LocaleCode", "[LocaleCode] <> ''");
                    table.CheckConstraint("CK_MenuItemTranslations_Name", "[Name] IS NULL OR [Name] <> ''");
                    table.CheckConstraint("CK_MenuItemTranslations_PublishedSourceVersion", "[PublishedSourceVersion] IS NULL OR [PublishedSourceVersion] >= 1");
                    table.ForeignKey(
                        name: "FK_MenuItemTranslations_AspNetUsers_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MenuItemTranslations_LocaleDefinitions_LocaleCode",
                        column: x => x.LocaleCode,
                        principalTable: "LocaleDefinitions",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MenuItemTranslations_MenuItems_MenuItemId",
                        column: x => x.MenuItemId,
                        principalTable: "MenuItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RestaurantSupportedLocales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LocaleCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantSupportedLocales", x => x.Id);
                    table.CheckConstraint("CK_RestaurantSupportedLocales_LocaleCode", "[LocaleCode] <> ''");
                    table.ForeignKey(
                        name: "FK_RestaurantSupportedLocales_LocaleDefinitions_LocaleCode",
                        column: x => x.LocaleCode,
                        principalTable: "LocaleDefinitions",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RestaurantSupportedLocales_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RestaurantTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LocaleCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    PublishedSource = table.Column<byte>(type: "tinyint", nullable: true),
                    PublishedSourceVersion = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DraftName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DraftDescription = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DraftAddress = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    DraftStatus = table.Column<byte>(type: "tinyint", nullable: true),
                    DraftSource = table.Column<byte>(type: "tinyint", nullable: true),
                    DraftSourceVersion = table.Column<int>(type: "int", nullable: true),
                    DraftGeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DraftLastError = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantTranslations", x => x.Id);
                    table.CheckConstraint("CK_RestaurantTranslations_Address", "[Address] IS NULL OR [Address] <> ''");
                    table.CheckConstraint("CK_RestaurantTranslations_Description", "[Description] IS NULL OR [Description] <> ''");
                    table.CheckConstraint("CK_RestaurantTranslations_DraftContent", "[DraftStatus] IS NULL OR ([DraftName] IS NOT NULL OR [DraftDescription] IS NOT NULL OR [DraftAddress] IS NOT NULL)");
                    table.CheckConstraint("CK_RestaurantTranslations_DraftSourceVersion", "[DraftSourceVersion] IS NULL OR [DraftSourceVersion] >= 1");
                    table.CheckConstraint("CK_RestaurantTranslations_DraftStatus", "[DraftStatus] IS NULL OR [DraftStatus] <> 3");
                    table.CheckConstraint("CK_RestaurantTranslations_LocaleCode", "[LocaleCode] <> ''");
                    table.CheckConstraint("CK_RestaurantTranslations_Name", "[Name] IS NULL OR [Name] <> ''");
                    table.CheckConstraint("CK_RestaurantTranslations_PublishedSourceVersion", "[PublishedSourceVersion] IS NULL OR [PublishedSourceVersion] >= 1");
                    table.ForeignKey(
                        name: "FK_RestaurantTranslations_AspNetUsers_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RestaurantTranslations_LocaleDefinitions_LocaleCode",
                        column: x => x.LocaleCode,
                        principalTable: "LocaleDefinitions",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RestaurantTranslations_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TranslationJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntityType = table.Column<byte>(type: "tinyint", nullable: false),
                    EntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetLocaleCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SourceLocaleCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SourceVersion = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    AttemptCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    MaxAttempts = table.Column<int>(type: "int", nullable: false, defaultValue: 3),
                    NextAttemptAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                    LastError = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TranslationJobs", x => x.Id);
                    table.CheckConstraint("CK_TranslationJobs_AttemptCount", "[AttemptCount] >= 0");
                    table.CheckConstraint("CK_TranslationJobs_MaxAttempts", "[MaxAttempts] >= 1");
                    table.CheckConstraint("CK_TranslationJobs_SourceLocaleCode", "[SourceLocaleCode] <> ''");
                    table.CheckConstraint("CK_TranslationJobs_SourceVersion", "[SourceVersion] >= 1");
                    table.CheckConstraint("CK_TranslationJobs_TargetLocaleCode", "[TargetLocaleCode] <> ''");
                    table.ForeignKey(
                        name: "FK_TranslationJobs_LocaleDefinitions_SourceLocaleCode",
                        column: x => x.SourceLocaleCode,
                        principalTable: "LocaleDefinitions",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TranslationJobs_LocaleDefinitions_TargetLocaleCode",
                        column: x => x.TargetLocaleCode,
                        principalTable: "LocaleDefinitions",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TranslationJobs_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "LocaleDefinitions",
                columns: new[] { "Code", "Direction", "DisplayName", "IsEnabled", "NativeName", "SortOrder" },
                values: new object[,]
                {
                    { "ar", (byte)2, "Arabic", true, "العربية", 1 },
                    { "de", (byte)1, "German", true, "Deutsch", 4 },
                    { "en", (byte)1, "English", true, "English", 2 },
                    { "es", (byte)1, "Spanish", true, "Español", 5 },
                    { "fa", (byte)2, "Persian", true, "فارسی", 8 },
                    { "fr", (byte)1, "French", true, "Français", 3 },
                    { "he", (byte)2, "Hebrew", true, "עברית", 9 },
                    { "it", (byte)1, "Italian", true, "Italiano", 6 },
                    { "tr", (byte)1, "Turkish", true, "Türkçe", 7 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantSettings_DefaultLocale",
                table: "RestaurantSettings",
                column: "DefaultLocale");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RestaurantSettings_DefaultLocale",
                table: "RestaurantSettings",
                sql: "[DefaultLocale] <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Restaurants_ContentVersion",
                table: "Restaurants",
                sql: "[ContentVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItems_ContentVersion",
                table: "MenuItems",
                sql: "[ContentVersion] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Categories_ContentVersion",
                table: "Categories",
                sql: "[ContentVersion] >= 1");

            migrationBuilder.CreateIndex(
                name: "IX_CategoryTranslations_ApprovedByUserId",
                table: "CategoryTranslations",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CategoryTranslations_CategoryId_LocaleCode",
                table: "CategoryTranslations",
                columns: new[] { "CategoryId", "LocaleCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CategoryTranslations_LocaleCode",
                table: "CategoryTranslations",
                column: "LocaleCode");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItemTranslations_ApprovedByUserId",
                table: "MenuItemTranslations",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItemTranslations_LocaleCode",
                table: "MenuItemTranslations",
                column: "LocaleCode");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItemTranslations_MenuItemId_LocaleCode",
                table: "MenuItemTranslations",
                columns: new[] { "MenuItemId", "LocaleCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantSupportedLocales_LocaleCode",
                table: "RestaurantSupportedLocales",
                column: "LocaleCode");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantSupportedLocales_RestaurantId_LocaleCode",
                table: "RestaurantSupportedLocales",
                columns: new[] { "RestaurantId", "LocaleCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantTranslations_ApprovedByUserId",
                table: "RestaurantTranslations",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantTranslations_LocaleCode",
                table: "RestaurantTranslations",
                column: "LocaleCode");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantTranslations_RestaurantId_LocaleCode",
                table: "RestaurantTranslations",
                columns: new[] { "RestaurantId", "LocaleCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TranslationAuditLogs_ActorUserId",
                table: "TranslationAuditLogs",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TranslationAuditLogs_RestaurantId_CreatedAt",
                table: "TranslationAuditLogs",
                columns: new[] { "RestaurantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TranslationJobs_IdempotencyKey",
                table: "TranslationJobs",
                column: "IdempotencyKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TranslationJobs_RestaurantId",
                table: "TranslationJobs",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_TranslationJobs_SourceLocaleCode",
                table: "TranslationJobs",
                column: "SourceLocaleCode");

            migrationBuilder.CreateIndex(
                name: "IX_TranslationJobs_Status_NextAttemptAt",
                table: "TranslationJobs",
                columns: new[] { "Status", "NextAttemptAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TranslationJobs_TargetLocaleCode",
                table: "TranslationJobs",
                column: "TargetLocaleCode");

            migrationBuilder.AddForeignKey(
                name: "FK_RestaurantSettings_LocaleDefinitions_DefaultLocale",
                table: "RestaurantSettings",
                column: "DefaultLocale",
                principalTable: "LocaleDefinitions",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RestaurantSettings_LocaleDefinitions_DefaultLocale",
                table: "RestaurantSettings");

            migrationBuilder.DropTable(
                name: "CategoryTranslations");

            migrationBuilder.DropTable(
                name: "MenuItemTranslations");

            migrationBuilder.DropTable(
                name: "RestaurantSupportedLocales");

            migrationBuilder.DropTable(
                name: "RestaurantTranslations");

            migrationBuilder.DropTable(
                name: "TranslationAuditLogs");

            migrationBuilder.DropTable(
                name: "TranslationJobs");

            migrationBuilder.DropTable(
                name: "LocaleDefinitions");

            migrationBuilder.DropIndex(
                name: "IX_RestaurantSettings_DefaultLocale",
                table: "RestaurantSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RestaurantSettings_DefaultLocale",
                table: "RestaurantSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Restaurants_ContentVersion",
                table: "Restaurants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItems_ContentVersion",
                table: "MenuItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Categories_ContentVersion",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "DefaultLocale",
                table: "RestaurantSettings");

            migrationBuilder.DropColumn(
                name: "TranslationMode",
                table: "RestaurantSettings");

            migrationBuilder.DropColumn(
                name: "ContentVersion",
                table: "Restaurants");

            migrationBuilder.DropColumn(
                name: "ContentVersion",
                table: "MenuItems");

            migrationBuilder.DropColumn(
                name: "ContentVersion",
                table: "Categories");
        }
    }
}
