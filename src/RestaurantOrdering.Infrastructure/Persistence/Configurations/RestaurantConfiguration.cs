using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Identity;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class RestaurantConfiguration : IEntityTypeConfiguration<Restaurant>
{
    public void Configure(EntityTypeBuilder<Restaurant> builder)
    {
        builder.Property(r => r.Slug)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(r => r.NameAr)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(r => r.NameEn)
            .HasMaxLength(150);

        builder.Property(r => r.DescriptionAr)
            .HasMaxLength(500);

        builder.Property(r => r.DescriptionEn)
            .HasMaxLength(500);

        builder.Property(r => r.PhoneNumber)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(r => r.WhatsAppNumber)
            .HasMaxLength(20);

        builder.Property(r => r.AddressAr)
            .HasMaxLength(300);

        builder.Property(r => r.AddressEn)
            .HasMaxLength(300);

        builder.Property(r => r.Latitude)
            .HasPrecision(10, 8);

        builder.Property(r => r.Longitude)
            .HasPrecision(11, 8);

        builder.Property(r => r.AccentColor)
            .HasMaxLength(7)
            .IsRequired()
            .HasDefaultValue("#B8663F");

        builder.HasIndex(r => r.Slug)
            .IsUnique();

        builder.HasIndex(r => r.OwnerId);

        builder.HasOne<ApplicationUser>()
            .WithMany(u => u.OwnedRestaurants)
            .HasForeignKey(r => r.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.LogoFile)
            .WithMany()
            .HasForeignKey(r => r.LogoFileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.CoverImageFile)
            .WithMany()
            .HasForeignKey(r => r.CoverImageFileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(r => r.CoverImageFileId);

        builder.HasQueryFilter(r => !r.IsDeleted);
    }
}
