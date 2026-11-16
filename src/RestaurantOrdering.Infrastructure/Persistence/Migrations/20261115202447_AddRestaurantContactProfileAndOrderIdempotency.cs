using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantContactProfileAndOrderIdempotency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Restaurants",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CountryCode",
                table: "Restaurants",
                type: "nvarchar(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Restaurants",
                type: "nvarchar(254)",
                maxLength: 254,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneCountryCode",
                table: "Restaurants",
                type: "nvarchar(8)",
                maxLength: 8,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "Orders",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyRequestHash",
                table: "Orders",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_RestaurantId_IdempotencyKey",
                table: "Orders",
                columns: new[] { "RestaurantId", "IdempotencyKey" },
                unique: true,
                filter: "[IdempotencyKey] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_RestaurantId_IdempotencyKey",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "City",
                table: "Restaurants");

            migrationBuilder.DropColumn(
                name: "CountryCode",
                table: "Restaurants");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Restaurants");

            migrationBuilder.DropColumn(
                name: "PhoneCountryCode",
                table: "Restaurants");

            migrationBuilder.DropColumn(
                name: "IdempotencyKey",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "IdempotencyRequestHash",
                table: "Orders");
        }
    }
}
