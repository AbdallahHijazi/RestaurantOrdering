using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantOrdering.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BackfillLegacyBilingualContentIntoTranslations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var statement in LegacyBilingualBackfillMigrationSql.AllBackfillStatements)
            {
                migrationBuilder.Sql(statement);
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: backfilled translation rows cannot be distinguished safely from
            // user-created rows that share PublishedSource Original/Manual with null drafts.
            // Rolling back schema is handled by reverting the foundation migration separately.
        }
    }
}
