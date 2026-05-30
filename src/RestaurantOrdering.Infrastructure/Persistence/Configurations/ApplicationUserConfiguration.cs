using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Infrastructure.Identity;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.Property(u => u.FullName)
            .HasMaxLength(150);

        builder.Property(u => u.IsActive)
            .IsRequired();

        builder.Property(u => u.IsDeleted)
            .IsRequired();

        builder.Property(u => u.CreatedAt)
            .IsRequired();

        builder.HasOne(u => u.AssignedRestaurant)
            .WithMany()
            .HasForeignKey(u => u.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(u => !u.IsDeleted);
    }
}
