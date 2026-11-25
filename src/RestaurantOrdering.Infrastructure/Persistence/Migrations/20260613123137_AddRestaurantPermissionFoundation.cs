using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantPermissionFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RestaurantUserPermissionGrants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Permission = table.Column<byte>(type: "tinyint", nullable: false),
                    GrantedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantUserPermissionGrants", x => x.Id);
                    table.CheckConstraint("CK_RestaurantUserPermissionGrants_Permission", "[Permission] >= 1 AND [Permission] <= 9");
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

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantUserPermissionGrants_GrantedByUserId",
                table: "RestaurantUserPermissionGrants",
                column: "GrantedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantUserPermissionGrants_RestaurantId_UserId",
                table: "RestaurantUserPermissionGrants",
                columns: new[] { "RestaurantId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantUserPermissionGrants_UserId_RestaurantId_Permission",
                table: "RestaurantUserPermissionGrants",
                columns: new[] { "UserId", "RestaurantId", "Permission" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RestaurantUserPermissionGrants");
        }
    }
}
