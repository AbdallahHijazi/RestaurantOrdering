using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder;

/// <summary>
/// Deterministic SHA-256 fingerprint of a public order request, used to tell a genuine replay of one
/// checkout attempt (same idempotency key, same payload) from reuse of a key with a different payload.
/// Item order is irrelevant; the idempotency key itself is not part of the fingerprint.
/// </summary>
public static class PublicOrderRequestFingerprint
{
    public static string Compute(CreatePublicOrderCommand command)
    {
        var inv = CultureInfo.InvariantCulture;
        var builder = new StringBuilder();

        void Append(string? value) => builder.Append(value?.Trim() ?? string.Empty).Append('\u001f');

        Append(command.GuestName);
        Append(command.GuestPhone);
        Append(((int)command.OrderType).ToString(inv));
        Append(command.TableToken);
        Append(command.DeliveryAddress);
        Append(command.DeliveryLatitude?.ToString(inv));
        Append(command.DeliveryLongitude?.ToString(inv));
        Append(command.Notes);
        Append(command.Locale?.Trim().ToLowerInvariant());

        foreach (var item in command.Items.OrderBy(i => i.MenuItemId).ThenBy(i => i.MenuItemSizeId))
        {
            Append(item.MenuItemId.ToString("N"));
            Append(item.Quantity.ToString(inv));
            Append(item.Notes);
            if (item.ExpectedUnitPrice is decimal expected) Append(expected.ToString("G29", inv));
            if (item.MenuItemSizeId is { } sizeId)
            {
                Append(sizeId.ToString("N"));
            }
            builder.Append('\u001e');
        }

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(builder.ToString()));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
