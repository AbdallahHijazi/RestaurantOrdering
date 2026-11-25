using FluentAssertions;
using Microsoft.Extensions.Options;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class JwtSigningKeyValidationTests
{
    [Fact]
    public void Startup_WithEmptySigningKey_FailsFast()
    {
        using var factory = TestWebApplicationFactory.CreateWithSigningKey(string.Empty);

        Action act = () => factory.CreateClient();

        act.Should()
            .Throw<OptionsValidationException>()
            .WithMessage("*Jwt:SigningKey*");
    }

    [Fact]
    public void Startup_WithSigningKeyShorterThan32Bytes_FailsFast()
    {
        using var factory = TestWebApplicationFactory.CreateWithSigningKey("1234567890123456789012345678901");

        Action act = () => factory.CreateClient();

        act.Should()
            .Throw<OptionsValidationException>()
            .WithMessage("*Jwt:SigningKey must be at least 32 bytes.*");
    }

    [Fact]
    public async Task Startup_WithSigningKeyAtLeast32Bytes_Succeeds()
    {
        using var factory = TestWebApplicationFactory.CreateWithSigningKey("12345678901234567890123456789012");
        using var client = factory.CreateClient();
        client.Should().NotBeNull();
        await Task.CompletedTask;
    }

    [Fact]
    public async Task Startup_WithMultibyteUtf8SigningKey_UsesByteLengthValidation()
    {
        var multibyteKey = "م".PadLeft(16, 'م'); // 16 Arabic chars => 32 UTF-8 bytes.
        using var factory = TestWebApplicationFactory.CreateWithSigningKey(multibyteKey);
        using var client = factory.CreateClient();
        client.Should().NotBeNull();
        await Task.CompletedTask;
    }
}
