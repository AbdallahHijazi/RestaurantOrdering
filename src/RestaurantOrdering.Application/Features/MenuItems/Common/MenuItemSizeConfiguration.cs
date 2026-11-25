using System.Text;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.MenuItems.Common;

public static class MenuItemSizeConfiguration
{
    public static void Apply(
        MenuItem item, bool? usesSizes, IReadOnlyList<MenuItemSize>? sizes, bool orderable)
    {
        var enabled = usesSizes ?? item.UsesSizes;
        var configured = item.Sizes ?? [];

        if (enabled && sizes is not null)
        {
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var ids = new HashSet<Guid>();
            var updated = new List<MenuItemSize>(sizes.Count);
            foreach (var size in sizes)
            {
                var name = size?.Name?.Trim();
                if (size is null || string.IsNullOrWhiteSpace(name) || name.Length > 150 ||
                    !names.Add(name.Normalize(NormalizationForm.FormKC)) ||
                    size.Price is < 0 or > 99999999.99m || decimal.Round(size.Price, 2) != size.Price ||
                    size.DisplayOrder < 0)
                {
                    throw new ConflictException("Each size requires a unique name, a valid price and a nonnegative display order.");
                }

                var id = size.Id ?? Guid.NewGuid();
                if (!ids.Add(id) || (size.Id.HasValue && !configured.Any(saved => saved.Id == id)))
                {
                    throw new ConflictException("The size does not belong to this menu item or is listed more than once.");
                }

                updated.Add(size with { Id = id, Name = name });
            }

            configured = updated.OrderBy(size => size.DisplayOrder).ToArray();
        }

        if (enabled && (configured.Count < 2 || (orderable && !configured.Any(size => size.IsAvailable))))
        {
            throw new ConflictException("Configure at least two sizes and make at least one available when the item is orderable.");
        }

        item.UsesSizes = enabled;
        if (enabled && sizes is not null)
        {
            item.Sizes = configured;
        }
    }
}
