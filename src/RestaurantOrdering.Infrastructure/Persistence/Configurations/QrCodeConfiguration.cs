using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class QrCodeConfiguration : IEntityTypeConfiguration<QrCode>
{
    public void Configure(EntityTypeBuilder<QrCode> builder)
    {
        builder.Property(q => q.TargetUrl)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(q => q.QrType)
            .HasConversion<byte>()
            .IsRequired();

        builder.HasIndex(q => new { q.RestaurantId, q.IsActive });

        builder.HasOne(q => q.Restaurant)
            .WithMany(r => r.QrCodes)
            .HasForeignKey(q => q.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(q => q.QrImageFile)
            .WithMany()
            .HasForeignKey(q => q.QrImageFileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_QrCodes_QrType", "[QrType] IN (1, 2)");
        });
    }
}
