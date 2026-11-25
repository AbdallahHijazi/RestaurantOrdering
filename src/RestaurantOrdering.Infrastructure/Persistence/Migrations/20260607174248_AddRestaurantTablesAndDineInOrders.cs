using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantTablesAndDineInOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_OrderType",
                table: "Orders");

            migrationBuilder.AddColumn<Guid>(
                name: "TableId",
                table: "Orders",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RestaurantTables",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Zone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PublicToken = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
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

            migrationBuilder.CreateIndex(
                name: "IX_Orders_TableId",
                table: "Orders",
                column: "TableId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_OrderType",
                table: "Orders",
                sql: "[OrderType] IN (1, 2, 3)");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantTables_PublicToken",
                table: "RestaurantTables",
                column: "PublicToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantTables_RestaurantId",
                table: "RestaurantTables",
                column: "RestaurantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_RestaurantTables_TableId",
                table: "Orders",
                column: "TableId",
                principalTable: "RestaurantTables",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_RestaurantTables_TableId",
                table: "Orders");

            migrationBuilder.DropTable(
                name: "RestaurantTables");

            migrationBuilder.DropIndex(
                name: "IX_Orders_TableId",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_OrderType",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TableId",
                table: "Orders");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_OrderType",
                table: "Orders",
                sql: "[OrderType] IN (1, 2)");
        }
    }
}
