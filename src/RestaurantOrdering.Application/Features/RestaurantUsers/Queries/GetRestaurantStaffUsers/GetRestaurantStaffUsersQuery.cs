using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Queries.GetRestaurantStaffUsers;

public sealed record GetRestaurantStaffUsersQuery(Guid RestaurantId)
    : IRequest<IReadOnlyList<RestaurantUserDto>>, IRestaurantScopedRequest;
