using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class MenuItemConfiguration : IEntityTypeConfiguration<MenuItem>
{
    public void Configure(EntityTypeBuilder<MenuItem> builder)
    {
        builder.Property(m => m.NameAr)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(m => m.NameEn)
            .HasMaxLength(150);

        builder.Property(m => m.DescriptionAr)
            .HasMaxLength(500);

        builder.Property(m => m.DescriptionEn)
            .HasMaxLength(500);

        builder.Property(m => m.Price)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(m => m.DiscountPrice)
            .HasPrecision(10, 2);

        builder.HasIndex(m => new { m.RestaurantId, m.CategoryId, m.IsActive, m.IsDeleted });

        builder.HasIndex(m => new { m.RestaurantId, m.IsAvailable, m.IsDeleted });

        builder.HasIndex(m => m.ImageFileId);

        builder.HasOne(m => m.Restaurant)
            .WithMany(r => r.MenuItems)
            .HasForeignKey(m => m.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Category)
            .WithMany(c => c.MenuItems)
            .HasForeignKey(m => m.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.ImageFile)
            .WithMany()
            .HasForeignKey(m => m.ImageFileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(m => !m.IsDeleted);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_MenuItems_Price", "[Price] >= 0");
            t.HasCheckConstraint(
                "CK_MenuItems_DiscountPrice",
                "[DiscountPrice] IS NULL OR [DiscountPrice] >= 0");
        });
    }
}
