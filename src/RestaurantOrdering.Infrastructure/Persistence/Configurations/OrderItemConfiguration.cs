using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.Property(oi => oi.ItemNameAr)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(oi => oi.ItemNameEn)
            .HasMaxLength(150);

        builder.Property(oi => oi.UnitPrice)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(oi => oi.TotalPrice)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(oi => oi.Notes)
            .HasMaxLength(200);

        builder.HasIndex(oi => oi.OrderId);

        builder.HasOne(oi => oi.Order)
            .WithMany(o => o.OrderItems)
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(oi => oi.MenuItem)
            .WithMany()
            .HasForeignKey(oi => oi.MenuItemId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_OrderItems_UnitPrice", "[UnitPrice] >= 0");
            t.HasCheckConstraint("CK_OrderItems_TotalPrice", "[TotalPrice] >= 0");
            t.HasCheckConstraint("CK_OrderItems_Quantity", "[Quantity] > 0");
        });
    }
}
