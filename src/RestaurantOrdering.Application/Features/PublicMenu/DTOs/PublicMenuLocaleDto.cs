namespace RestaurantOrdering.Application.Features.PublicMenu.DTOs;

/// <summary>
/// A language the restaurant offers to customers on its public menu.
/// Exposed on the public menu so anonymous visitors never need the admin locale endpoint.
/// </summary>
public sealed class PublicMenuLocaleDto
{
    public string Code { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string NativeName { get; init; } = string.Empty;
    public string Direction { get; init; } = "ltr";
    public bool IsDefault { get; init; }
}
