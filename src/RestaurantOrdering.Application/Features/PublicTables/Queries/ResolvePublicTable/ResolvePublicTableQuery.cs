using MediatR;
using RestaurantOrdering.Application.Features.PublicTables.DTOs;

namespace RestaurantOrdering.Application.Features.PublicTables.Queries.ResolvePublicTable;

public sealed record ResolvePublicTableQuery(string RestaurantSlug, string Token)
    : IRequest<ResolvedPublicTableDto>;
