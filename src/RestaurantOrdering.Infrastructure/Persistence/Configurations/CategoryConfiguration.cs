using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.Property(c => c.NameAr)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(c => c.NameEn)
            .HasMaxLength(100);

        builder.Property(c => c.DescriptionAr)
            .HasMaxLength(300);

        builder.Property(c => c.DescriptionEn)
            .HasMaxLength(300);

        builder.HasIndex(c => new { c.RestaurantId, c.IsActive, c.IsDeleted });

        builder.HasOne(c => c.Restaurant)
            .WithMany(r => r.Categories)
            .HasForeignKey(c => c.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(c => !c.IsDeleted);
    }
}
