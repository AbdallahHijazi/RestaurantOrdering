using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class RestaurantSupportedLocaleConfiguration : IEntityTypeConfiguration<RestaurantSupportedLocale>
{
    public void Configure(EntityTypeBuilder<RestaurantSupportedLocale> builder)
    {
        builder.Property(s => s.LocaleCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(s => s.IsEnabled)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(s => s.SortOrder)
            .IsRequired();

        builder.Property(s => s.CreatedAt)
            .IsRequired();

        builder.HasIndex(s => new { s.RestaurantId, s.LocaleCode })
            .IsUnique();

        builder.HasOne(s => s.Restaurant)
            .WithMany()
            .HasForeignKey(s => s.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Locale)
            .WithMany()
            .HasForeignKey(s => s.LocaleCode)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(s => !s.Restaurant.IsDeleted);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_RestaurantSupportedLocales_LocaleCode", "[LocaleCode] <> ''");
        });
    }
}
