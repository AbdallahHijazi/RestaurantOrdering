using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.MediaFiles.DTOs;

namespace RestaurantOrdering.Application.Features.MediaFiles.Commands.UploadMediaFile;

public sealed class UploadMediaFileCommand : IRequest<MediaFileDto>, IRestaurantDashboardScopedRequest
{
    public Guid RestaurantId { get; init; }
    public Stream Content { get; init; } = Stream.Null;
    public string OriginalFileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long DeclaredFileSizeBytes { get; init; }
}
