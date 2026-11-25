using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.Translations;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.Commands.ApproveTranslation;
using RestaurantOrdering.Application.Features.Translations.Commands.BulkApproveTranslations;
using RestaurantOrdering.Application.Features.Translations.Commands.RetryTranslation;
using RestaurantOrdering.Application.Features.Translations.Commands.UpdateTranslationDraft;
using RestaurantOrdering.Application.Features.Translations.DTOs;
using RestaurantOrdering.Application.Features.Translations.Queries.GetTranslationById;
using RestaurantOrdering.Application.Features.Translations.Queries.GetTranslations;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Authorize(Policy = ApplicationPolicies.KitchenDashboardAccess)]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/translations")]
public sealed class RestaurantTranslationsController : ControllerBase
{
    private readonly ISender _sender;

    public RestaurantTranslationsController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedTranslationReviewResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedTranslationReviewResultDto>> GetTranslations(
        Guid restaurantId,
        [FromQuery] string? entityType,
        [FromQuery] string? locale,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (!TryParseEntityType(entityType, out var parsedEntityType, out var entityTypeError))
        {
            return BadRequest(entityTypeError);
        }

        if (!TryParseStatus(status, out var parsedStatus, out var statusError))
        {
            return BadRequest(statusError);
        }

        var result = await _sender.Send(
            new GetTranslationsQuery(
                restaurantId,
                parsedEntityType,
                locale,
                parsedStatus,
                page,
                pageSize),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{translationId:guid}")]
    [ProducesResponseType(typeof(TranslationReviewDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TranslationReviewDto>> GetTranslationById(
        Guid restaurantId,
        Guid translationId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new GetTranslationByIdQuery(restaurantId, translationId),
            cancellationToken);

        return Ok(result);
    }

    [HttpPut("{translationId:guid}")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(TranslationReviewDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TranslationReviewDto>> UpdateTranslationDraft(
        Guid restaurantId,
        Guid translationId,
        [FromBody] UpdateTranslationDraftRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new UpdateTranslationDraftCommand(
                restaurantId,
                translationId,
                request.Name,
                request.Description,
                request.Address),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("{translationId:guid}/approve")]
    [ProducesResponseType(typeof(TranslationReviewDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TranslationReviewDto>> ApproveTranslation(
        Guid restaurantId,
        Guid translationId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new ApproveTranslationCommand(restaurantId, translationId),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("bulk-approve")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(IReadOnlyList<TranslationReviewDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TranslationReviewDto>>> BulkApproveTranslations(
        Guid restaurantId,
        [FromBody] BulkApproveTranslationsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new BulkApproveTranslationsCommand(restaurantId, request.TranslationIds),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("{translationId:guid}/retry")]
    [ProducesResponseType(typeof(TranslationReviewDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TranslationReviewDto>> RetryTranslation(
        Guid restaurantId,
        Guid translationId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new RetryTranslationCommand(restaurantId, translationId),
            cancellationToken);

        return Ok(result);
    }

    private static bool TryParseEntityType(
        string? value,
        out TranslatableEntityType? parsed,
        out string? error)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            parsed = null;
            error = null;
            return true;
        }

        if (Enum.TryParse<TranslatableEntityType>(value, ignoreCase: true, out var entityType))
        {
            parsed = entityType;
            error = null;
            return true;
        }

        parsed = null;
        error = $"Unknown entity type '{value}'.";
        return false;
    }

    private static bool TryParseStatus(
        string? value,
        out TranslationStatus? parsed,
        out string? error)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            parsed = null;
            error = null;
            return true;
        }

        if (Enum.TryParse<TranslationStatus>(value, ignoreCase: true, out var status))
        {
            parsed = status;
            error = null;
            return true;
        }

        parsed = null;
        error = $"Unknown translation status '{value}'.";
        return false;
    }
}
