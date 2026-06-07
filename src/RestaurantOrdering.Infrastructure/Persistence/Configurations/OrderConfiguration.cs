using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.Property(o => o.OrderNumber)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(o => o.GuestName)
            .HasMaxLength(100);

        builder.Property(o => o.GuestPhone)
            .HasMaxLength(20);

        builder.Property(o => o.DeliveryAddress)
            .HasMaxLength(400);

        builder.Property(o => o.Notes)
            .HasMaxLength(500);

        builder.Property(o => o.CurrencyCode)
            .HasMaxLength(3)
            .IsRequired();

        builder.Property(o => o.OrderType)
            .HasConversion<byte>()
            .IsRequired();

        builder.Property(o => o.OrderStatus)
            .HasConversion<byte>()
            .IsRequired();

        builder.Property(o => o.DeliveryLatitude)
            .HasPrecision(10, 8);

        builder.Property(o => o.DeliveryLongitude)
            .HasPrecision(11, 8);

        builder.Property(o => o.Subtotal)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(o => o.DiscountAmount)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(o => o.TaxAmount)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(o => o.DeliveryFee)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(o => o.TotalAmount)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.HasIndex(o => new { o.RestaurantId, o.OrderNumber })
            .IsUnique();

        builder.HasIndex(o => new { o.RestaurantId, o.CreatedAt });

        builder.HasIndex(o => new { o.RestaurantId, o.OrderStatus });

        builder.HasIndex(o => o.GuestPhone);

        builder.HasOne(o => o.Restaurant)
            .WithMany(r => r.Orders)
            .HasForeignKey(o => o.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.Customer)
            .WithMany(c => c.Orders)
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(o => o.Table)
            .WithMany(t => t.Orders)
            .HasForeignKey(o => o.TableId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(o => o.TableId);

        builder.HasQueryFilter(o => !o.IsDeleted);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Orders_OrderType", "[OrderType] IN (1, 2, 3)");
            t.HasCheckConstraint("CK_Orders_OrderStatus", "[OrderStatus] IN (1, 2, 3, 4, 5)");
            t.HasCheckConstraint("CK_Orders_Subtotal", "[Subtotal] >= 0");
            t.HasCheckConstraint("CK_Orders_DiscountAmount", "[DiscountAmount] >= 0");
            t.HasCheckConstraint("CK_Orders_TaxAmount", "[TaxAmount] >= 0");
            t.HasCheckConstraint("CK_Orders_DeliveryFee", "[DeliveryFee] >= 0");
            t.HasCheckConstraint("CK_Orders_TotalAmount", "[TotalAmount] >= 0");
        });
    }
}
