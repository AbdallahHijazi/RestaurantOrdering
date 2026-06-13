using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Identity;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class TranslationAuditLogConfiguration : IEntityTypeConfiguration<TranslationAuditLog>
{
    public void Configure(EntityTypeBuilder<TranslationAuditLog> builder)
    {
        builder.Property(a => a.EventType)
            .HasConversion<byte>()
            .IsRequired();

        builder.Property(a => a.EntityType)
            .HasConversion<byte>();

        builder.Property(a => a.LocaleCode)
            .HasMaxLength(20);

        builder.Property(a => a.PayloadJson);

        builder.Property(a => a.CreatedAt)
            .IsRequired();

        builder.HasIndex(a => new { a.RestaurantId, a.CreatedAt });

        builder.HasOne(a => a.Restaurant)
            .WithMany()
            .HasForeignKey(a => a.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(a => a.ActorUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(a => !a.Restaurant.IsDeleted);
    }
}
