using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class RestaurantSettingsConfiguration : IEntityTypeConfiguration<RestaurantSettings>
{
    public void Configure(EntityTypeBuilder<RestaurantSettings> builder)
    {
        builder.Property(s => s.CurrencyCode)
            .HasMaxLength(3)
            .IsRequired();

        builder.Property(s => s.TimeZone)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(s => s.TaxRate)
            .HasPrecision(5, 2)
            .IsRequired();

        builder.Property(s => s.DeliveryFee)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(s => s.MinimumOrderAmount)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.HasIndex(s => s.RestaurantId)
            .IsUnique();

        builder.HasOne(s => s.Restaurant)
            .WithOne(r => r.Settings)
            .HasForeignKey<RestaurantSettings>(s => s.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(s => !s.Restaurant.IsDeleted);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_RestaurantSettings_TaxRate", "[TaxRate] >= 0 AND [TaxRate] <= 100");
            t.HasCheckConstraint("CK_RestaurantSettings_DeliveryFee", "[DeliveryFee] >= 0");
            t.HasCheckConstraint("CK_RestaurantSettings_MinimumOrderAmount", "[MinimumOrderAmount] >= 0");
        });
    }
}
