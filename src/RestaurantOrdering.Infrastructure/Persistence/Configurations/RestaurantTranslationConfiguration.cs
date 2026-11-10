using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Identity;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class RestaurantTranslationConfiguration : IEntityTypeConfiguration<RestaurantTranslation>
{
    public void Configure(EntityTypeBuilder<RestaurantTranslation> builder)
    {
        builder.Property(t => t.LocaleCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(t => t.Name)
            .HasMaxLength(150);

        builder.Property(t => t.Description)
            .HasMaxLength(500);

        builder.Property(t => t.Address)
            .HasMaxLength(300);

        builder.Property(t => t.PublishedSource)
            .HasConversion<byte>();

        builder.Property(t => t.DraftName)
            .HasMaxLength(150);

        builder.Property(t => t.DraftDescription)
            .HasMaxLength(500);

        builder.Property(t => t.DraftAddress)
            .HasMaxLength(300);

        builder.Property(t => t.DraftStatus)
            .HasConversion<byte>();

        builder.Property(t => t.DraftSource)
            .HasConversion<byte>();

        builder.Property(t => t.DraftLastError)
            .HasMaxLength(500);

        builder.HasIndex(t => new { t.RestaurantId, t.LocaleCode })
            .IsUnique();

        builder.HasOne(t => t.Restaurant)
            .WithMany()
            .HasForeignKey(t => t.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.Locale)
            .WithMany()
            .HasForeignKey(t => t.LocaleCode)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(t => t.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(t => !t.Restaurant.IsDeleted);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_RestaurantTranslations_LocaleCode", TranslationCheckConstraints.LocaleCodeNotEmpty);
            t.HasCheckConstraint("CK_RestaurantTranslations_Name", TranslationCheckConstraints.PublishedNameNotBlank);
            t.HasCheckConstraint("CK_RestaurantTranslations_Description", TranslationCheckConstraints.PublishedDescriptionNotBlank);
            t.HasCheckConstraint("CK_RestaurantTranslations_Address", TranslationCheckConstraints.PublishedAddressNotBlank);
            t.HasCheckConstraint("CK_RestaurantTranslations_PublishedSourceVersion", TranslationCheckConstraints.PublishedSourceVersionValid);
            t.HasCheckConstraint("CK_RestaurantTranslations_DraftSourceVersion", TranslationCheckConstraints.DraftSourceVersionValid);
            t.HasCheckConstraint("CK_RestaurantTranslations_DraftStatus", TranslationCheckConstraints.DraftStatusNotApproved);
            t.HasCheckConstraint("CK_RestaurantTranslations_DraftContent", TranslationCheckConstraints.RestaurantDraftContentRequiredWhenDraftStatusSet);
        });
    }
}

