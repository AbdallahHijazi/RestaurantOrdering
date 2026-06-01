using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantOrdering.Api.Contracts.Admin.MediaFiles;
using RestaurantOrdering.Application.Features.MediaFiles.Commands.SetRestaurantLogo;
using RestaurantOrdering.Application.Features.MediaFiles.Commands.UploadMediaFile;
using RestaurantOrdering.Application.Features.MediaFiles.DTOs;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Authorize]
[Route("api/v1/admin/restaurants/{restaurantId:guid}")]
public sealed class MediaFilesController : ControllerBase
{
    private readonly ISender _sender;

    public MediaFilesController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("media")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6291456)]
    [RequestFormLimits(MultipartBodyLengthLimit = 6291456)]
    [EnableRateLimiting("admin-upload")]
    [ProducesResponseType(typeof(UploadedMediaFileResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<UploadedMediaFileResponse>> Upload(
        Guid restaurantId,
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file is null)
        {
            throw new ArgumentException("A file is required.", nameof(file));
        }

        await using var content = file.OpenReadStream();

        var command = new UploadMediaFileCommand
        {
            RestaurantId = restaurantId,
            Content = content,
            OriginalFileName = file.FileName,
            ContentType = file.ContentType,
            DeclaredFileSizeBytes = file.Length
        };

        var result = await _sender.Send(command, cancellationToken);
        var response = ToUploadedMediaFileResponse(result);

        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpPut("logo")]
    [Consumes("application/json")]
    [RequestSizeLimit(16384)]
    [ProducesResponseType(typeof(RestaurantDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantDto>> SetLogo(
        Guid restaurantId,
        [FromBody] SetRestaurantLogoRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new SetRestaurantLogoCommand(restaurantId, request.MediaFileId),
            cancellationToken);

        return Ok(result);
    }

    private static UploadedMediaFileResponse ToUploadedMediaFileResponse(MediaFileDto dto) =>
        new()
        {
            Id = dto.Id,
            RestaurantId = dto.RestaurantId,
            FileName = dto.FileName,
            FileUrl = dto.FileUrl,
            ContentType = dto.ContentType,
            FileSizeBytes = dto.FileSizeBytes,
            CreatedAt = dto.CreatedAt
        };
}
