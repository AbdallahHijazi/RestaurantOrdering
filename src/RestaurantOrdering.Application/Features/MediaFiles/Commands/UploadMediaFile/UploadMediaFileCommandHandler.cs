using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Models;
using RestaurantOrdering.Application.Features.MediaFiles.Common;
using RestaurantOrdering.Application.Features.MediaFiles.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.MediaFiles.Commands.UploadMediaFile;

public sealed class UploadMediaFileCommandHandler
    : IRequestHandler<UploadMediaFileCommand, MediaFileDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _fileStorageService;
    private readonly IDateTimeService _dateTimeService;

    public UploadMediaFileCommandHandler(
        IApplicationDbContext context,
        IFileStorageService fileStorageService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
        _dateTimeService = dateTimeService;
    }

    public async Task<MediaFileDto> Handle(
        UploadMediaFileCommand request,
        CancellationToken cancellationToken)
    {
        var restaurantExists = await _context.Restaurants
            .AsNoTracking()
            .AnyAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (!restaurantExists)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
        }

        var storageResult = await _fileStorageService.SaveAsync(
            request.Content,
            new FileStorageRequest
            {
                RestaurantId = request.RestaurantId,
                OriginalFileName = request.OriginalFileName,
                ContentType = request.ContentType,
                DeclaredFileSizeBytes = request.DeclaredFileSizeBytes
            },
            cancellationToken);

        try
        {
            var utcNow = _dateTimeService.UtcNow;

            var mediaFile = new MediaFile
            {
                Id = Guid.NewGuid(),
                RestaurantId = request.RestaurantId,
                FileName = storageResult.SanitizedOriginalFileName,
                StoredFileName = storageResult.StoredFileName,
                OriginalFileName = storageResult.SanitizedOriginalFileName,
                FileUrl = storageResult.FileUrl,
                ContentType = storageResult.ContentType,
                FileSizeBytes = storageResult.ActualFileSizeBytes,
                EntityType = null,
                EntityId = null,
                IsDeleted = false,
                CreatedAt = utcNow
            };

            _context.MediaFiles.Add(mediaFile);

            await _context.SaveChangesAsync(cancellationToken);

            return mediaFile.ToDto();
        }
        catch
        {
            // Handles the usual rollback path after physical storage succeeds.
            // Orphan files may remain only after abrupt crashes between storage and DB save;
            // those can be cleaned up later via a maintenance job.
            try
            {
                await _fileStorageService.DeleteAsync(
                    request.RestaurantId,
                    storageResult.StoredFileName,
                    CancellationToken.None);
            }
            catch
            {
                // Do not let cleanup failure hide the original DB exception.
            }

            throw;
        }
    }
}
