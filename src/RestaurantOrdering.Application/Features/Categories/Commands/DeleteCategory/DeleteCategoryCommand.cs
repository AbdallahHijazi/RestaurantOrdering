using MediatR;
using RestaurantOrdering.Application.Common.Security;

namespace RestaurantOrdering.Application.Features.Categories.Commands.DeleteCategory;

public sealed record DeleteCategoryCommand(Guid CategoryId, Guid RestaurantId)
    : IRequest<Unit>, IRestaurantDashboardScopedRequest;
