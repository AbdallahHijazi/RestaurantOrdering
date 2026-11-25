using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderLocaleSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "FallbackApplied",
                table: "Orders",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RequestedLocale",
                table: "Orders",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResolvedLocale",
                table: "Orders",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ar");

            migrationBuilder.AddColumn<string>(
                name: "DisplayedItemName",
                table: "OrderItems",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DisplayedLocale",
                table: "OrderItems",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ar");

            migrationBuilder.Sql(
                """
                UPDATE [OrderItems]
                SET [DisplayedItemName] = [ItemNameAr]
                WHERE [DisplayedItemName] = ''
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FallbackApplied",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RequestedLocale",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ResolvedLocale",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DisplayedItemName",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "DisplayedLocale",
                table: "OrderItems");
        }
    }
}
