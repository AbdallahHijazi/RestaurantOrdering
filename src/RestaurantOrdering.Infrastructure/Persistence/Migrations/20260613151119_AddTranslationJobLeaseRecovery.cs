using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTranslationJobLeaseRecovery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ClaimedAt",
                table: "TranslationJobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LeaseExpiresAt",
                table: "TranslationJobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkerId",
                table: "TranslationJobs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TranslationJobs_Status_LeaseExpiresAt",
                table: "TranslationJobs",
                columns: new[] { "Status", "LeaseExpiresAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TranslationJobs_Status_LeaseExpiresAt",
                table: "TranslationJobs");

            migrationBuilder.DropColumn(
                name: "ClaimedAt",
                table: "TranslationJobs");

            migrationBuilder.DropColumn(
                name: "LeaseExpiresAt",
                table: "TranslationJobs");

            migrationBuilder.DropColumn(
                name: "WorkerId",
                table: "TranslationJobs");
        }
    }
}
