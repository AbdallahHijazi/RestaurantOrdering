using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Common;

internal static class RestaurantTableTokenService
{
    internal static async Task<string> GenerateUniqueTokenAsync(
        IApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        const int maxAttempts = 8;

        for (var attempt = 0; attempt < maxAttempts; attempt++)
        {
            var candidate = TablePublicTokenGenerator.Generate();
            var exists = await context.RestaurantTables
                .AsNoTracking()
                .AnyAsync(t => t.PublicToken == candidate, cancellationToken);

            if (!exists)
            {
                return candidate;
            }
        }

        throw new ConflictException("Unable to generate a unique table token. Please try again.");
    }

    internal static async Task<RestaurantTable> ResolveActiveTableAsync(
        IApplicationDbContext context,
        Guid restaurantId,
        string token,
        CancellationToken cancellationToken)
    {
        var normalizedToken = token.Trim();
        var table = await context.RestaurantTables
            .FirstOrDefaultAsync(
                t => t.RestaurantId == restaurantId && t.PublicToken == normalizedToken,
                cancellationToken);

        if (table is null)
        {
            throw new NotFoundException("Table", normalizedToken);
        }

        if (!table.IsActive)
        {
            throw new ConflictException("This table QR code is disabled.");
        }

        return table;
    }
}
