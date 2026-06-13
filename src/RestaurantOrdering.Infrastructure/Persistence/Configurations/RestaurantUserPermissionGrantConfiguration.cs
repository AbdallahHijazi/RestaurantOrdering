using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Identity;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class RestaurantUserPermissionGrantConfiguration : IEntityTypeConfiguration<RestaurantUserPermissionGrant>
{
    public void Configure(EntityTypeBuilder<RestaurantUserPermissionGrant> builder)
    {
        builder.Property(grant => grant.Permission)
            .HasConversion<byte>()
            .IsRequired();

        builder.Property(grant => grant.CreatedAt)
            .IsRequired();

        builder.HasIndex(grant => new { grant.UserId, grant.RestaurantId, grant.Permission })
            .IsUnique();

        builder.HasIndex(grant => new { grant.RestaurantId, grant.UserId });

        builder.HasOne(grant => grant.Restaurant)
            .WithMany()
            .HasForeignKey(grant => grant.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(grant => grant.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(grant => grant.GrantedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(grant => !grant.Restaurant.IsDeleted);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint(
                "CK_RestaurantUserPermissionGrants_Permission",
                "[Permission] >= 1 AND [Permission] <= 9");
        });
    }
}
