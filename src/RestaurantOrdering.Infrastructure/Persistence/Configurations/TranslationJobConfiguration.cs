using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class TranslationJobConfiguration : IEntityTypeConfiguration<TranslationJob>
{
    public void Configure(EntityTypeBuilder<TranslationJob> builder)
    {
        builder.Property(j => j.EntityType)
            .HasConversion<byte>()
            .IsRequired();

        builder.Property(j => j.TargetLocaleCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(j => j.SourceLocaleCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(j => j.SourceVersion)
            .IsRequired()
            .HasDefaultValue(1);

        builder.Property(j => j.Status)
            .HasConversion<byte>()
            .IsRequired()
            .HasDefaultValue(TranslationJobStatus.Queued)
            .HasSentinel((TranslationJobStatus)0);

        builder.Property(j => j.AttemptCount)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(j => j.MaxAttempts)
            .IsRequired()
            .HasDefaultValue(3);

        builder.Property(j => j.IdempotencyKey)
            .HasMaxLength(180)
            .IsRequired();

        builder.Property(j => j.LastError)
            .HasMaxLength(1000);

        builder.Property(j => j.ClaimedAt);

        builder.Property(j => j.LeaseExpiresAt);

        builder.Property(j => j.WorkerId)
            .HasMaxLength(100);

        builder.Property(j => j.CreatedAt)
            .IsRequired();

        builder.HasIndex(j => j.IdempotencyKey)
            .IsUnique();

        builder.HasIndex(j => new { j.Status, j.NextAttemptAt });

        builder.HasIndex(j => new { j.Status, j.LeaseExpiresAt });

        builder.HasOne(j => j.Restaurant)
            .WithMany()
            .HasForeignKey(j => j.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(j => j.TargetLocale)
            .WithMany()
            .HasForeignKey(j => j.TargetLocaleCode)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(j => j.SourceLocale)
            .WithMany()
            .HasForeignKey(j => j.SourceLocaleCode)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(j => !j.Restaurant.IsDeleted);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_TranslationJobs_TargetLocaleCode", "[TargetLocaleCode] <> ''");
            t.HasCheckConstraint("CK_TranslationJobs_SourceLocaleCode", "[SourceLocaleCode] <> ''");
            t.HasCheckConstraint("CK_TranslationJobs_SourceVersion", "[SourceVersion] >= 1");
            t.HasCheckConstraint("CK_TranslationJobs_AttemptCount", "[AttemptCount] >= 0");
            t.HasCheckConstraint("CK_TranslationJobs_MaxAttempts", "[MaxAttempts] >= 1");
        });
    }
}
