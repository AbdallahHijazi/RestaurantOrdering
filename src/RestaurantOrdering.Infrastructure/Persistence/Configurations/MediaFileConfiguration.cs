using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class MediaFileConfiguration : IEntityTypeConfiguration<MediaFile>
{
    public void Configure(EntityTypeBuilder<MediaFile> builder)
    {
        builder.Property(m => m.FileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(m => m.StoredFileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(m => m.OriginalFileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(m => m.FileUrl)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(m => m.ContentType)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(m => m.EntityType)
            .HasMaxLength(50);

        builder.HasIndex(m => m.RestaurantId);

        builder.HasOne(m => m.Restaurant)
            .WithMany(r => r.MediaFiles)
            .HasForeignKey(m => m.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(m => !m.IsDeleted);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_MediaFiles_FileSizeBytes", "[FileSizeBytes] >= 0");
        });
    }
}
