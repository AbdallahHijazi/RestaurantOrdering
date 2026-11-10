using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Persistence.Seed;

namespace RestaurantOrdering.Infrastructure.Persistence.Configurations;

public class LocaleDefinitionConfiguration : IEntityTypeConfiguration<LocaleDefinition>
{
    public void Configure(EntityTypeBuilder<LocaleDefinition> builder)
    {
        builder.HasKey(l => l.Code);

        builder.Property(l => l.Code)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(l => l.DisplayName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(l => l.NativeName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(l => l.Direction)
            .HasConversion<byte>()
            .IsRequired();

        builder.Property(l => l.IsEnabled)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(l => l.SortOrder)
            .IsRequired();

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_LocaleDefinitions_Code", "\"Code\" <> ''");
        });

        builder.HasData(LocaleDefinitionSeed.All);
    }
}

