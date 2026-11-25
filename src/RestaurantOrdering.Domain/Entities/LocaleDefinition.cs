using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Domain.Entities;

public class LocaleDefinition
{
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string NativeName { get; set; } = string.Empty;
    public TextDirection Direction { get; set; }
    public bool IsEnabled { get; set; } = true;
    public int SortOrder { get; set; }
}
