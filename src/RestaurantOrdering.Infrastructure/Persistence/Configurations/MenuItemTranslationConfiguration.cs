using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Identity;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class MenuItemTranslationConfiguration : IEntityTypeConfiguration<MenuItemTranslation>
{
    public void Configure(EntityTypeBuilder<MenuItemTranslation> builder)
    {
        builder.Property(t => t.LocaleCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(t => t.Name)
            .HasMaxLength(150);

        builder.Property(t => t.Description)
            .HasMaxLength(500);

        builder.Property(t => t.PublishedSource)
            .HasConversion<byte>();

        builder.Property(t => t.DraftName)
            .HasMaxLength(150);

        builder.Property(t => t.DraftDescription)
            .HasMaxLength(500);

        builder.Property(t => t.DraftStatus)
            .HasConversion<byte>();

        builder.Property(t => t.DraftSource)
            .HasConversion<byte>();

        builder.Property(t => t.DraftLastError)
            .HasMaxLength(500);

        builder.HasIndex(t => new { t.MenuItemId, t.LocaleCode })
            .IsUnique();

        builder.HasOne(t => t.MenuItem)
            .WithMany()
            .HasForeignKey(t => t.MenuItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.Locale)
            .WithMany()
            .HasForeignKey(t => t.LocaleCode)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(t => t.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(t => !t.MenuItem.IsDeleted);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_MenuItemTranslations_LocaleCode", TranslationCheckConstraints.LocaleCodeNotEmpty);
            t.HasCheckConstraint("CK_MenuItemTranslations_Name", TranslationCheckConstraints.PublishedNameNotBlank);
            t.HasCheckConstraint("CK_MenuItemTranslations_Description", TranslationCheckConstraints.PublishedDescriptionNotBlank);
            t.HasCheckConstraint("CK_MenuItemTranslations_PublishedSourceVersion", TranslationCheckConstraints.PublishedSourceVersionValid);
            t.HasCheckConstraint("CK_MenuItemTranslations_DraftSourceVersion", TranslationCheckConstraints.DraftSourceVersionValid);
            t.HasCheckConstraint("CK_MenuItemTranslations_DraftStatus", TranslationCheckConstraints.DraftStatusNotApproved);
            t.HasCheckConstraint("CK_MenuItemTranslations_DraftContent", TranslationCheckConstraints.DraftContentRequiredWhenDraftStatusSet);
        });
    }
}
