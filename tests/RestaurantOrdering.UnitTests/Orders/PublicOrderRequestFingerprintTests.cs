using FluentAssertions;
using RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder;
using RestaurantOrdering.Domain.Enums;
using Xunit;

namespace RestaurantOrdering.UnitTests.Orders;

/// <summary>BUG-013: the fingerprint separates a replay of one request from a different request.</summary>
public sealed class PublicOrderRequestFingerprintTests
{
    private static readonly Guid ItemA = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid ItemB = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");

    [Fact]
    public void Same_request_produces_the_same_fingerprint_regardless_of_the_key()
    {
        var first = PublicOrderRequestFingerprint.Compute(Create(idempotencyKey: "key-aaaaaaaa"));
        var second = PublicOrderRequestFingerprint.Compute(Create(idempotencyKey: "key-bbbbbbbb"));

        first.Should().Be(second);
        first.Should().HaveLength(64);
    }

    [Fact]
    public void Item_order_does_not_change_the_fingerprint()
    {
        var one = Create(items: [new(ItemA, 1, null), new(ItemB, 2, null)]);
        var other = Create(items: [new(ItemB, 2, null), new(ItemA, 1, null)]);

        PublicOrderRequestFingerprint.Compute(one).Should().Be(PublicOrderRequestFingerprint.Compute(other));
    }

    [Fact]
    public void Surrounding_whitespace_does_not_change_the_fingerprint()
    {
        PublicOrderRequestFingerprint.Compute(Create(guestPhone: " +962791234567 "))
            .Should().Be(PublicOrderRequestFingerprint.Compute(Create(guestPhone: "+962791234567")));
    }

    [Fact]
    public void Different_quantity_phone_or_notes_change_the_fingerprint()
    {
        var baseline = PublicOrderRequestFingerprint.Compute(Create());

        PublicOrderRequestFingerprint.Compute(Create(items: [new(ItemA, 2, null)])).Should().NotBe(baseline);
        PublicOrderRequestFingerprint.Compute(Create(guestPhone: "+962791234568")).Should().NotBe(baseline);
        PublicOrderRequestFingerprint.Compute(Create(notes: "extra")).Should().NotBe(baseline);
        PublicOrderRequestFingerprint.Compute(Create(items: [new(ItemB, 1, null)])).Should().NotBe(baseline);
    }

    private static CreatePublicOrderCommand Create(
        string guestPhone = "+962791234567",
        string? notes = null,
        string? idempotencyKey = null,
        IReadOnlyList<CreatePublicOrderItemRequest>? items = null) =>
        new(
            RestaurantSlug: "restaurant-a",
            GuestName: "Guest",
            GuestPhone: guestPhone,
            OrderType: OrderType.Pickup,
            TableToken: null,
            DeliveryAddress: null,
            DeliveryLatitude: null,
            DeliveryLongitude: null,
            Notes: notes,
            Locale: null,
            Items: items ?? [new CreatePublicOrderItemRequest(ItemA, 1, null)],
            IdempotencyKey: idempotencyKey);
}
