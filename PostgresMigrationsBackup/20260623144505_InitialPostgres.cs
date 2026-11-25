using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LocaleDefinitions",
                columns: table => new
                {
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NativeName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Direction = table.Column<byte>(type: "smallint", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocaleDefinitions", x => x.Code);
                    table.CheckConstraint("CK_LocaleDefinitions_Code", "\"Code\" <> ''");
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    NameAr = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NameEn = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DescriptionAr = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    DescriptionEn = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    ContentVersion = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                    table.CheckConstraint("CK_Categories_ContentVersion", "\"ContentVersion\" >= 1");
                });

            migrationBuilder.CreateTable(
                name: "CategoryTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    LocaleCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PublishedSource = table.Column<byte>(type: "smallint", nullable: true),
                    PublishedSourceVersion = table.Column<int>(type: "integer", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DraftName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    DraftDescription = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DraftStatus = table.Column<byte>(type: "smallint", nullable: true),
                    DraftSource = table.Column<byte>(type: "smallint", nullable: true),
                    DraftSourceVersion = table.Column<int>(type: "integer", nullable: true),
                    DraftGeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DraftLastError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoryTranslations", x => x.Id);
                    table.CheckConstraint("CK_CategoryTranslations_Description", "\"Description\" IS NULL OR \"Description\" <> ''");
                    table.CheckConstraint("CK_CategoryTranslations_DraftContent", "\"DraftStatus\" IS NULL OR (\"DraftName\" IS NOT NULL OR \"DraftDescription\" IS NOT NULL)");
                    table.CheckConstraint("CK_CategoryTranslations_DraftSourceVersion", "\"DraftSourceVersion\" IS NULL OR \"DraftSourceVersion\" >= 1");
                    table.CheckConstraint("CK_CategoryTranslations_DraftStatus", "\"DraftStatus\" IS NULL OR \"DraftStatus\" <> 3");
                    table.CheckConstraint("CK_CategoryTranslations_LocaleCode", "\"LocaleCode\" <> ''");
                    table.CheckConstraint("CK_CategoryTranslations_Name", "\"Name\" IS NULL OR \"Name\" <> ''");
                    table.CheckConstraint("CK_CategoryTranslations_PublishedSourceVersion", "\"PublishedSourceVersion\" IS NULL OR \"PublishedSourceVersion\" >= 1");
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
                name: "Customers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MediaFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    StoredFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FileUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    EntityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaFiles", x => x.Id);
                    table.CheckConstraint("CK_MediaFiles_FileSizeBytes", "\"FileSizeBytes\" >= 0");
                });

            migrationBuilder.CreateTable(
                name: "Restaurants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    NameAr = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    NameEn = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    DescriptionAr = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DescriptionEn = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    LogoFileId = table.Column<Guid>(type: "uuid", nullable: true),
                    CoverImageFileId = table.Column<Guid>(type: "uuid", nullable: true),
                    AccentColor = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false, defaultValue: "#B8663F"),
                    PhoneNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WhatsAppNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AddressAr = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    AddressEn = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Latitude = table.Column<decimal>(type: "numeric(10,8)", precision: 10, scale: 8, nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric(11,8)", precision: 11, scale: 8, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    ContentVersion = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Restaurants", x => x.Id);
                    table.CheckConstraint("CK_Restaurants_ContentVersion", "\"ContentVersion\" >= 1");
                    table.ForeignKey(
                        name: "FK_Restaurants_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Restaurants_MediaFiles_CoverImageFileId",
                        column: x => x.CoverImageFileId,
                        principalTable: "MediaFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Restaurants_MediaFiles_LogoFileId",
                        column: x => x.LogoFileId,
                        principalTable: "MediaFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MenuItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImageFileId = table.Column<Guid>(type: "uuid", nullable: true),
                    NameAr = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    NameEn = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    DescriptionAr = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DescriptionEn = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    DiscountPrice = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    ContentVersion = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenuItems", x => x.Id);
                    table.CheckConstraint("CK_MenuItems_ContentVersion", "\"ContentVersion\" >= 1");
                    table.CheckConstraint("CK_MenuItems_DiscountPrice", "\"DiscountPrice\" IS NULL OR \"DiscountPrice\" >= 0");
                    table.CheckConstraint("CK_MenuItems_DiscountPrice_NotGreaterThanPrice", "\"DiscountPrice\" IS NULL OR \"DiscountPrice\" <= \"Price\"");
                    table.CheckConstraint("CK_MenuItems_Price", "\"Price\" >= 0");
                    table.ForeignKey(
                        name: "FK_MenuItems_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MenuItems_MediaFiles_ImageFileId",
                        column: x => x.ImageFileId,
                        principalTable: "MediaFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MenuItems_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QrCodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    QrImageFileId = table.Column<Guid>(type: "uuid", nullable: true),
                    QrType = table.Column<byte>(type: "smallint", nullable: false),
                    TargetUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QrCodes", x => x.Id);
                    table.CheckConstraint("CK_QrCodes_QrType", "\"QrType\" IN (1, 2)");
                    table.ForeignKey(
                        name: "FK_QrCodes_MediaFiles_QrImageFileId",
                        column: x => x.QrImageFileId,
                        principalTable: "MediaFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QrCodes_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RestaurantSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    DefaultLocale = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "ar"),
                    TranslationMode = table.Column<byte>(type: "smallint", nullable: false, defaultValue: (byte)2),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    TimeZone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TaxRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    DeliveryFee = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    MinimumOrderAmount = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    IsDeliveryEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsPickupEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    WorkingHoursJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantSettings", x => x.Id);
                    table.CheckConstraint("CK_RestaurantSettings_DefaultLocale", "\"DefaultLocale\" <> ''");
                    table.CheckConstraint("CK_RestaurantSettings_DeliveryFee", "\"DeliveryFee\" >= 0");
                    table.CheckConstraint("CK_RestaurantSettings_MinimumOrderAmount", "\"MinimumOrderAmount\" >= 0");
                    table.CheckConstraint("CK_RestaurantSettings_TaxRate", "\"TaxRate\" >= 0 AND \"TaxRate\" <= 100");
                    table.ForeignKey(
                        name: "FK_RestaurantSettings_LocaleDefinitions_DefaultLocale",
                        column: x => x.DefaultLocale,
                        principalTable: "LocaleDefinitions",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RestaurantSettings_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RestaurantSupportedLocales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    LocaleCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantSupportedLocales", x => x.Id);
                    table.CheckConstraint("CK_RestaurantSupportedLocales_LocaleCode", "\"LocaleCode\" <> ''");
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
                name: "RestaurantTables",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Zone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PublicToken = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantTables", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RestaurantTables_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RestaurantTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    LocaleCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    PublishedSource = table.Column<byte>(type: "smallint", nullable: true),
                    PublishedSourceVersion = table.Column<int>(type: "integer", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DraftName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    DraftDescription = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DraftAddress = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    DraftStatus = table.Column<byte>(type: "smallint", nullable: true),
                    DraftSource = table.Column<byte>(type: "smallint", nullable: true),
                    DraftSourceVersion = table.Column<int>(type: "integer", nullable: true),
                    DraftGeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DraftLastError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantTranslations", x => x.Id);
                    table.CheckConstraint("CK_RestaurantTranslations_Address", "\"Address\" IS NULL OR \"Address\" <> ''");
                    table.CheckConstraint("CK_RestaurantTranslations_Description", "\"Description\" IS NULL OR \"Description\" <> ''");
                    table.CheckConstraint("CK_RestaurantTranslations_DraftContent", "\"DraftStatus\" IS NULL OR (\"DraftName\" IS NOT NULL OR \"DraftDescription\" IS NOT NULL OR \"DraftAddress\" IS NOT NULL)");
                    table.CheckConstraint("CK_RestaurantTranslations_DraftSourceVersion", "\"DraftSourceVersion\" IS NULL OR \"DraftSourceVersion\" >= 1");
                    table.CheckConstraint("CK_RestaurantTranslations_DraftStatus", "\"DraftStatus\" IS NULL OR \"DraftStatus\" <> 3");
                    table.CheckConstraint("CK_RestaurantTranslations_LocaleCode", "\"LocaleCode\" <> ''");
                    table.CheckConstraint("CK_RestaurantTranslations_Name", "\"Name\" IS NULL OR \"Name\" <> ''");
                    table.CheckConstraint("CK_RestaurantTranslations_PublishedSourceVersion", "\"PublishedSourceVersion\" IS NULL OR \"PublishedSourceVersion\" >= 1");
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
                name: "RestaurantUserPermissionGrants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Permission = table.Column<byte>(type: "smallint", nullable: false),
                    GrantedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantUserPermissionGrants", x => x.Id);
                    table.CheckConstraint("CK_RestaurantUserPermissionGrants_Permission", "\"Permission\" >= 1 AND \"Permission\" <= 9");
                    table.ForeignKey(
                        name: "FK_RestaurantUserPermissionGrants_AspNetUsers_GrantedByUserId",
                        column: x => x.GrantedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RestaurantUserPermissionGrants_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RestaurantUserPermissionGrants_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TranslationAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EventType = table.Column<byte>(type: "smallint", nullable: false),
                    EntityType = table.Column<byte>(type: "smallint", nullable: true),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    LocaleCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    PayloadJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                name: "TranslationJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    EntityType = table.Column<byte>(type: "smallint", nullable: false),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetLocaleCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SourceLocaleCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SourceVersion = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    Status = table.Column<byte>(type: "smallint", nullable: false, defaultValue: (byte)1),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    MaxAttempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 3),
                    NextAttemptAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    LastError = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClaimedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LeaseExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WorkerId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TranslationJobs", x => x.Id);
                    table.CheckConstraint("CK_TranslationJobs_AttemptCount", "\"AttemptCount\" >= 0");
                    table.CheckConstraint("CK_TranslationJobs_MaxAttempts", "\"MaxAttempts\" >= 1");
                    table.CheckConstraint("CK_TranslationJobs_SourceLocaleCode", "\"SourceLocaleCode\" <> ''");
                    table.CheckConstraint("CK_TranslationJobs_SourceVersion", "\"SourceVersion\" >= 1");
                    table.CheckConstraint("CK_TranslationJobs_TargetLocaleCode", "\"TargetLocaleCode\" <> ''");
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

            migrationBuilder.CreateTable(
                name: "MenuItemTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MenuItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    LocaleCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PublishedSource = table.Column<byte>(type: "smallint", nullable: true),
                    PublishedSourceVersion = table.Column<int>(type: "integer", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DraftName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    DraftDescription = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DraftStatus = table.Column<byte>(type: "smallint", nullable: true),
                    DraftSource = table.Column<byte>(type: "smallint", nullable: true),
                    DraftSourceVersion = table.Column<int>(type: "integer", nullable: true),
                    DraftGeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DraftLastError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenuItemTranslations", x => x.Id);
                    table.CheckConstraint("CK_MenuItemTranslations_Description", "\"Description\" IS NULL OR \"Description\" <> ''");
                    table.CheckConstraint("CK_MenuItemTranslations_DraftContent", "\"DraftStatus\" IS NULL OR (\"DraftName\" IS NOT NULL OR \"DraftDescription\" IS NOT NULL)");
                    table.CheckConstraint("CK_MenuItemTranslations_DraftSourceVersion", "\"DraftSourceVersion\" IS NULL OR \"DraftSourceVersion\" >= 1");
                    table.CheckConstraint("CK_MenuItemTranslations_DraftStatus", "\"DraftStatus\" IS NULL OR \"DraftStatus\" <> 3");
                    table.CheckConstraint("CK_MenuItemTranslations_LocaleCode", "\"LocaleCode\" <> ''");
                    table.CheckConstraint("CK_MenuItemTranslations_Name", "\"Name\" IS NULL OR \"Name\" <> ''");
                    table.CheckConstraint("CK_MenuItemTranslations_PublishedSourceVersion", "\"PublishedSourceVersion\" IS NULL OR \"PublishedSourceVersion\" >= 1");
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
                name: "Orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    GuestName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    GuestPhone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    OrderType = table.Column<byte>(type: "smallint", nullable: false),
                    TableId = table.Column<Guid>(type: "uuid", nullable: true),
                    OrderStatus = table.Column<byte>(type: "smallint", nullable: false),
                    DeliveryAddress = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true),
                    DeliveryLatitude = table.Column<decimal>(type: "numeric(10,8)", precision: 10, scale: 8, nullable: true),
                    DeliveryLongitude = table.Column<decimal>(type: "numeric(11,8)", precision: 11, scale: 8, nullable: true),
                    Subtotal = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    DeliveryFee = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RequestedLocale = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ResolvedLocale = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "ar"),
                    FallbackApplied = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.CheckConstraint("CK_Orders_DeliveryFee", "\"DeliveryFee\" >= 0");
                    table.CheckConstraint("CK_Orders_DiscountAmount", "\"DiscountAmount\" >= 0");
                    table.CheckConstraint("CK_Orders_OrderStatus", "\"OrderStatus\" IN (1, 2, 3, 4, 5)");
                    table.CheckConstraint("CK_Orders_OrderType", "\"OrderType\" IN (1, 2, 3)");
                    table.CheckConstraint("CK_Orders_Subtotal", "\"Subtotal\" >= 0");
                    table.CheckConstraint("CK_Orders_TaxAmount", "\"TaxAmount\" >= 0");
                    table.CheckConstraint("CK_Orders_TotalAmount", "\"TotalAmount\" >= 0");
                    table.ForeignKey(
                        name: "FK_Orders_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Orders_RestaurantTables_TableId",
                        column: x => x.TableId,
                        principalTable: "RestaurantTables",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Orders_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    MenuItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    ItemNameAr = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ItemNameEn = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    DisplayedItemName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    DisplayedLocale = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "ar"),
                    UnitPrice = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    Notes = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItems", x => x.Id);
                    table.CheckConstraint("CK_OrderItems_Quantity", "\"Quantity\" > 0");
                    table.CheckConstraint("CK_OrderItems_TotalPrice", "\"TotalPrice\" >= 0");
                    table.CheckConstraint("CK_OrderItems_UnitPrice", "\"UnitPrice\" >= 0");
                    table.ForeignKey(
                        name: "FK_OrderItems_MenuItems_MenuItemId",
                        column: x => x.MenuItemId,
                        principalTable: "MenuItems",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OrderItems_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
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
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_RestaurantId",
                table: "AspNetUsers",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_RestaurantId_IsActive_IsDeleted",
                table: "Categories",
                columns: new[] { "RestaurantId", "IsActive", "IsDeleted" });

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
                name: "IX_Customers_RestaurantId_Phone",
                table: "Customers",
                columns: new[] { "RestaurantId", "Phone" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MediaFiles_RestaurantId",
                table: "MediaFiles",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_CategoryId",
                table: "MenuItems",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_ImageFileId",
                table: "MenuItems",
                column: "ImageFileId");

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_RestaurantId_CategoryId_IsActive_IsDeleted",
                table: "MenuItems",
                columns: new[] { "RestaurantId", "CategoryId", "IsActive", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_MenuItems_RestaurantId_IsAvailable_IsDeleted",
                table: "MenuItems",
                columns: new[] { "RestaurantId", "IsAvailable", "IsDeleted" });

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
                name: "IX_OrderItems_MenuItemId",
                table: "OrderItems",
                column: "MenuItemId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId",
                table: "OrderItems",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CustomerId",
                table: "Orders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_GuestPhone",
                table: "Orders",
                column: "GuestPhone");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_RestaurantId_CreatedAt",
                table: "Orders",
                columns: new[] { "RestaurantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_RestaurantId_OrderNumber",
                table: "Orders",
                columns: new[] { "RestaurantId", "OrderNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_RestaurantId_OrderStatus",
                table: "Orders",
                columns: new[] { "RestaurantId", "OrderStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_TableId",
                table: "Orders",
                column: "TableId");

            migrationBuilder.CreateIndex(
                name: "IX_QrCodes_QrImageFileId",
                table: "QrCodes",
                column: "QrImageFileId");

            migrationBuilder.CreateIndex(
                name: "IX_QrCodes_RestaurantId_IsActive",
                table: "QrCodes",
                columns: new[] { "RestaurantId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Restaurants_CoverImageFileId",
                table: "Restaurants",
                column: "CoverImageFileId");

            migrationBuilder.CreateIndex(
                name: "IX_Restaurants_LogoFileId",
                table: "Restaurants",
                column: "LogoFileId");

            migrationBuilder.CreateIndex(
                name: "IX_Restaurants_OwnerId",
                table: "Restaurants",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Restaurants_Slug",
                table: "Restaurants",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantSettings_DefaultLocale",
                table: "RestaurantSettings",
                column: "DefaultLocale");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantSettings_RestaurantId",
                table: "RestaurantSettings",
                column: "RestaurantId",
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
                name: "IX_RestaurantTables_PublicToken",
                table: "RestaurantTables",
                column: "PublicToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantTables_RestaurantId",
                table: "RestaurantTables",
                column: "RestaurantId");

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
                name: "IX_RestaurantUserPermissionGrants_GrantedByUserId",
                table: "RestaurantUserPermissionGrants",
                column: "GrantedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantUserPermissionGrants_RestaurantId_UserId",
                table: "RestaurantUserPermissionGrants",
                columns: new[] { "RestaurantId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantUserPermissionGrants_UserId_RestaurantId_Permissi~",
                table: "RestaurantUserPermissionGrants",
                columns: new[] { "UserId", "RestaurantId", "Permission" },
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
                name: "IX_TranslationJobs_Status_LeaseExpiresAt",
                table: "TranslationJobs",
                columns: new[] { "Status", "LeaseExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TranslationJobs_Status_NextAttemptAt",
                table: "TranslationJobs",
                columns: new[] { "Status", "NextAttemptAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TranslationJobs_TargetLocaleCode",
                table: "TranslationJobs",
                column: "TargetLocaleCode");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                table: "AspNetUserClaims",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                table: "AspNetUserLogins",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                table: "AspNetUserRoles",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_Restaurants_RestaurantId",
                table: "AspNetUsers",
                column: "RestaurantId",
                principalTable: "Restaurants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Restaurants_RestaurantId",
                table: "Categories",
                column: "RestaurantId",
                principalTable: "Restaurants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Customers_Restaurants_RestaurantId",
                table: "Customers",
                column: "RestaurantId",
                principalTable: "Restaurants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MediaFiles_Restaurants_RestaurantId",
                table: "MediaFiles",
                column: "RestaurantId",
                principalTable: "Restaurants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Restaurants_AspNetUsers_OwnerId",
                table: "Restaurants");

            migrationBuilder.DropForeignKey(
                name: "FK_MediaFiles_Restaurants_RestaurantId",
                table: "MediaFiles");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "CategoryTranslations");

            migrationBuilder.DropTable(
                name: "MenuItemTranslations");

            migrationBuilder.DropTable(
                name: "OrderItems");

            migrationBuilder.DropTable(
                name: "QrCodes");

            migrationBuilder.DropTable(
                name: "RestaurantSettings");

            migrationBuilder.DropTable(
                name: "RestaurantSupportedLocales");

            migrationBuilder.DropTable(
                name: "RestaurantTranslations");

            migrationBuilder.DropTable(
                name: "RestaurantUserPermissionGrants");

            migrationBuilder.DropTable(
                name: "TranslationAuditLogs");

            migrationBuilder.DropTable(
                name: "TranslationJobs");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "MenuItems");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "LocaleDefinitions");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Customers");

            migrationBuilder.DropTable(
                name: "RestaurantTables");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "Restaurants");

            migrationBuilder.DropTable(
                name: "MediaFiles");
        }
    }
}
