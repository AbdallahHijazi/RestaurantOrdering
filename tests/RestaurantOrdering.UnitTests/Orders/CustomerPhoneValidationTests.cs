using FluentAssertions;
using RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder;
using RestaurantOrdering.Domain.Enums;
using Xunit;

namespace RestaurantOrdering.UnitTests.Orders;

/// <summary>BUG-012: customer phone numbers must be validated, not just length-limited.</summary>
public sealed class CustomerPhoneValidationTests
{
    [Theory]
    [InlineData("+962791234567")]
    [InlineData("+962 79 123 4567")]
    [InlineData("0791234567")]
    [InlineData("079-123-4567")]
    [InlineData("(555) 010-1010")]
    [InlineData("555.010.1010")]
    [InlineData("00962791234567")]
    [InlineData("+15550101010")]
    [InlineData("1234567")]
    [InlineData("٠٧٩١٢٣٤٥٦٧")]
    [InlineData("  0791234567  ")]
    public void Accepts_legitimate_local_and_international_numbers(string phone)
    {
        CustomerPhoneValidation.IsValid(phone).Should().BeTrue();
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("phone")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("123")]
    [InlineData("123456")]
    [InlineData("1234567890123456")]
    [InlineData("++962791234567")]
    [InlineData("96279+1234567")]
    [InlineData("0791234567abc")]
    [InlineData("079<script>")]
    [InlineData("+--------")]
    [InlineData("123456789012345678901")]
    public void Rejects_alphabetic_short_long_and_malformed_values(string? phone)
    {
        CustomerPhoneValidation.IsValid(phone).Should().BeFalse();
    }

    [Fact]
    public void Validator_reports_an_error_on_GuestPhone_for_alphabetic_input()
    {
        var validator = new CreatePublicOrderCommandValidator();

        var result = validator.Validate(CreateCommand(guestPhone: "abc"));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == nameof(CreatePublicOrderCommand.GuestPhone));
    }

    [Fact]
    public void Validator_accepts_a_valid_phone()
    {
        var validator = new CreatePublicOrderCommandValidator();

        validator.Validate(CreateCommand(guestPhone: "+962 79 123 4567")).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("short")]
    [InlineData("has space in it")]
    [InlineData("bad/key/chars!")]
    public void Validator_rejects_malformed_idempotency_keys(string key)
    {
        var validator = new CreatePublicOrderCommandValidator();

        var result = validator.Validate(CreateCommand(guestPhone: "+962791234567", idempotencyKey: key));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == nameof(CreatePublicOrderCommand.IdempotencyKey));
    }

    [Fact]
    public void Validator_accepts_a_guid_idempotency_key_and_no_key()
    {
        var validator = new CreatePublicOrderCommandValidator();

        validator
            .Validate(CreateCommand(guestPhone: "+962791234567", idempotencyKey: Guid.NewGuid().ToString()))
            .IsValid.Should().BeTrue();
        validator
            .Validate(CreateCommand(guestPhone: "+962791234567", idempotencyKey: null))
            .IsValid.Should().BeTrue();
    }

    private static CreatePublicOrderCommand CreateCommand(string guestPhone, string? idempotencyKey = null) =>
        new(
            RestaurantSlug: "restaurant-a",
            GuestName: "Guest",
            GuestPhone: guestPhone,
            OrderType: OrderType.Pickup,
            TableToken: null,
            DeliveryAddress: null,
            DeliveryLatitude: null,
            DeliveryLongitude: null,
            Notes: null,
            Locale: null,
            Items: [new CreatePublicOrderItemRequest(Guid.NewGuid(), 1, null)],
            IdempotencyKey: idempotencyKey);
}
