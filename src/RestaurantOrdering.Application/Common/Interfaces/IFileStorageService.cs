using RestaurantOrdering.Application.Common.Models;

namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IFileStorageService
{
    Task<FileStorageResult> SaveAsync(
        Stream content,
        FileStorageRequest request,
        CancellationToken cancellationToken);

    Task DeleteAsync(
        Guid restaurantId,
        string storedFileName,
        CancellationToken cancellationToken);
}
