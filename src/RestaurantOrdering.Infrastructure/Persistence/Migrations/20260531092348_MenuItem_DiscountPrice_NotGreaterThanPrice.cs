using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MenuItem_DiscountPrice_NotGreaterThanPrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_MenuItems_DiscountPrice_NotGreaterThanPrice",
                table: "MenuItems",
                sql: "[DiscountPrice] IS NULL OR [DiscountPrice] <= [Price]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_MenuItems_DiscountPrice_NotGreaterThanPrice",
                table: "MenuItems");
        }
    }
}
