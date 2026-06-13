using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Common.Interfaces;

public interface ITranslationJobEnqueuer
{
    Task EnqueueForEntityAsync(
        Guid restaurantId,
        TranslatableEntityType entityType,
        Guid entityId,
        int contentVersion,
        CancellationToken cancellationToken);
}
