using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMenuDiscountPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AppliedDiscountType",
                table: "OrderItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AppliedDiscountValue",
                table: "OrderItems",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BaseUnitPrice",
                table: "OrderItems",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitDiscountAmount",
                table: "OrderItems",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Discount",
                table: "MenuItems",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SizeDiscountMode",
                table: "MenuItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "UniformDiscount",
                table: "MenuItems",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppliedDiscountType",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "AppliedDiscountValue",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "BaseUnitPrice",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "UnitDiscountAmount",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Discount",
                table: "MenuItems");

            migrationBuilder.DropColumn(
                name: "SizeDiscountMode",
                table: "MenuItems");

            migrationBuilder.DropColumn(
                name: "UniformDiscount",
                table: "MenuItems");
        }
    }
}
