using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Orders.Common;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Application.Features.RestaurantTables.Common;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder;

public sealed class CreatePublicOrderCommandHandler
    : IRequestHandler<CreatePublicOrderCommand, PublicOrderConfirmationDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly IPublicLocaleResolver _publicLocaleResolver;

    public CreatePublicOrderCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService,
        IPublicLocaleResolver publicLocaleResolver)
    {
        _context = context;
        _dateTimeService = dateTimeService;
        _publicLocaleResolver = publicLocaleResolver;
    }

    public async Task<PublicOrderConfirmationDto> Handle(
        CreatePublicOrderCommand request,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = SlugNormalizer.Normalize(request.RestaurantSlug);

        var restaurant = await _context.Restaurants
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.Slug == normalizedSlug && r.IsActive,
                cancellationToken);

        if (restaurant is null)
        {
            throw new NotFoundException("Restaurant", normalizedSlug);
        }

        // Idempotency: a replay of the same logical request (same key + same payload) returns the
        // originally created order instead of creating another one.
        var idempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey)
            ? null
            : request.IdempotencyKey.Trim();
        string? requestHash = null;

        if (idempotencyKey is not null)
        {
            requestHash = PublicOrderRequestFingerprint.Compute(request);

            var replay = await TryReplayAsync(
                restaurant.Id,
                idempotencyKey,
                requestHash,
                cancellationToken);

            if (replay is not null)
            {
                return replay;
            }
        }

        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RestaurantId == restaurant.Id, cancellationToken);

        if (settings is null)
        {
            throw new ConflictException("Restaurant settings are not configured.");
        }

        if (request.OrderType == OrderType.Delivery && !settings.IsDeliveryEnabled)
        {
            throw new ConflictException("Delivery is not available for this restaurant.");
        }

        if (request.OrderType == OrderType.Pickup && !settings.IsPickupEnabled)
        {
            throw new ConflictException("Pickup is not available for this restaurant.");
        }

        Guid? tableId = null;

        if (request.OrderType == OrderType.DineIn)
        {
            var table = await RestaurantTableTokenService.ResolveActiveTableAsync(
                _context,
                restaurant.Id,
                request.TableToken!,
                cancellationToken);
            tableId = table.Id;
        }

        var localeContext = await PublicLocaleContextLoader.LoadAsync(
            _context,
            restaurant.Id,
            settings.DefaultLocale,
            cancellationToken);

        var menuLocale = _publicLocaleResolver.ResolveMenuLocale(
            request.Locale,
            localeContext.DefaultLocale,
            localeContext.SupportedLocales,
            localeContext.LocaleDefinitions);

        var guestName = request.GuestName.Trim();
        var guestPhone = request.GuestPhone.Trim();
        var notes = TrimToOptional(request.Notes);

        string? deliveryAddress = null;
        decimal? deliveryLatitude = null;
        decimal? deliveryLongitude = null;
        decimal deliveryFee;

        if (request.OrderType == OrderType.Delivery)
        {
            deliveryAddress = request.DeliveryAddress!.Trim();
            deliveryLatitude = request.DeliveryLatitude;
            deliveryLongitude = request.DeliveryLongitude;
            deliveryFee = settings.DeliveryFee;
        }
        else
        {
            deliveryFee = 0m;
        }

        var menuItemIds = request.Items
            .Select(item => item.MenuItemId)
            .Distinct()
            .ToList();

        var menuItems = await _context.MenuItems
            .AsNoTracking()
            .Where(item =>
                menuItemIds.Contains(item.Id) &&
                item.RestaurantId == restaurant.Id &&
                !item.IsDeleted &&
                item.IsActive &&
                item.IsAvailable && (!item.UsesSizes || _context.Categories.Any(category =>
                    category.Id == item.CategoryId && category.RestaurantId == restaurant.Id && category.IsActive)))
            .ToListAsync(cancellationToken);

        var menuItemsById = menuItems.ToDictionary(item => item.Id);

        var menuItemTranslations = await PublicMenuTranslationLoader.LoadMenuItemsAsync(
            _context,
            menuItemIds,
            cancellationToken);

        var utcNow = _dateTimeService.UtcNow;
        var orderItems = new List<OrderItem>();
        decimal subtotal = 0;
        var changedPrices = new List<UpdatedOrderPrice>();

        foreach (var requestItem in request.Items)
        {
            if (!menuItemsById.TryGetValue(requestItem.MenuItemId, out var menuItem))
            {
                throw new NotFoundException("MenuItem", requestItem.MenuItemId);
            }

            var localizedItem = _publicLocaleResolver.ResolveMenuItemContent(
                menuLocale,
                localeContext.DefaultLocale,
                localeContext.SupportedLocales,
                localeContext.LocaleDefinitions,
                PublicMenuTranslationLoader.GetMenuItemTranslations(menuItemTranslations, menuItem.Id),
                menuItem.ContentVersion,
                menuItem.NameAr,
                menuItem.NameEn,
                menuItem.DescriptionAr,
                menuItem.DescriptionEn);

            var size = menuItem.UsesSizes && requestItem.MenuItemSizeId.HasValue
                ? menuItem.Sizes?.SingleOrDefault(option => option.Id == requestItem.MenuItemSizeId && option.IsAvailable)
                : null;

            if ((menuItem.UsesSizes && size is null) || (!menuItem.UsesSizes && requestItem.MenuItemSizeId.HasValue))
            {
                throw new ConflictException("Select an available size for this menu item.");
            }

            var pricing = MenuPricing.ForItem(menuItem, size);
            var unitPrice = pricing.FinalPrice;
            if (requestItem.ExpectedUnitPrice is decimal expected && expected != unitPrice)
            {
                changedPrices.Add(new UpdatedOrderPrice(menuItem.Id, size?.Id, pricing.BasePrice, unitPrice));
            }
            var totalPrice = unitPrice * requestItem.Quantity;
            subtotal += totalPrice;

            orderItems.Add(new OrderItem
            {
                MenuItemId = requestItem.MenuItemId,
                MenuItemSizeId = size?.Id,
                SizeName = size?.Name,
                ItemNameAr = menuItem.NameAr,
                ItemNameEn = menuItem.NameEn,
                DisplayedItemName = localizedItem.Name,
                DisplayedLocale = localizedItem.ResolvedLocale,
                UnitPrice = unitPrice,
                BaseUnitPrice = pricing.BasePrice,
                UnitDiscountAmount = pricing.DiscountAmount,
                AppliedDiscountType = pricing.Discount?.Type,
                AppliedDiscountValue = pricing.Discount?.Value,
                Quantity = requestItem.Quantity,
                TotalPrice = totalPrice,
                Notes = TrimToOptional(requestItem.Notes),
                CreatedAt = utcNow
            });
        }

        if (changedPrices.Count > 0)
        {
            throw new OrderPricesChangedException(changedPrices);
        }

        if (subtotal < settings.MinimumOrderAmount)
        {
            throw new ConflictException("Order subtotal is below the restaurant minimum order amount.");
        }

        const decimal discountAmount = 0m;
        var taxableAmount = subtotal - discountAmount;
        var taxAmount = Math.Round(
            taxableAmount * settings.TaxRate / 100m,
            2,
            MidpointRounding.AwayFromZero);
        var totalAmount = subtotal - discountAmount + taxAmount + deliveryFee;

        var orderId = Guid.NewGuid();

        var order = new Order
        {
            Id = orderId,
            RestaurantId = restaurant.Id,
            OrderNumber = OrderNumberGenerator.Generate(orderId),
            CustomerId = null,
            GuestName = guestName,
            GuestPhone = guestPhone,
            OrderType = request.OrderType,
            TableId = tableId,
            OrderStatus = OrderStatus.New,
            DeliveryAddress = deliveryAddress,
            DeliveryLatitude = deliveryLatitude,
            DeliveryLongitude = deliveryLongitude,
            Subtotal = subtotal,
            DiscountAmount = discountAmount,
            TaxAmount = taxAmount,
            DeliveryFee = deliveryFee,
            TotalAmount = totalAmount,
            CurrencyCode = settings.CurrencyCode,
            Notes = notes,
            RequestedLocale = menuLocale.RequestedLocale,
            ResolvedLocale = menuLocale.ResolvedLocale,
            FallbackApplied = menuLocale.FallbackApplied,
            IsDeleted = false,
            IdempotencyKey = idempotencyKey,
            IdempotencyRequestHash = requestHash,
            CreatedAt = utcNow,
            OrderItems = orderItems
        };

        _context.Orders.Add(order);

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (idempotencyKey is not null)
        {
            // A concurrent request with the same key won the race (unique index on
            // RestaurantId + IdempotencyKey). Return that order, or reject a mismatching payload.
            var replay = await TryReplayAsync(
                restaurant.Id,
                idempotencyKey,
                requestHash!,
                cancellationToken);

            if (replay is not null)
            {
                return replay;
            }

            throw;
        }

        return ToConfirmation(order);
    }

    private async Task<PublicOrderConfirmationDto?> TryReplayAsync(
        Guid restaurantId,
        string idempotencyKey,
        string requestHash,
        CancellationToken cancellationToken)
    {
        var existing = await _context.Orders
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(
                o => o.RestaurantId == restaurantId && o.IdempotencyKey == idempotencyKey,
                cancellationToken);

        if (existing is null)
        {
            return null;
        }

        if (!string.Equals(existing.IdempotencyRequestHash, requestHash, StringComparison.Ordinal))
        {
            throw new ConflictException(
                "The idempotency key was already used with a different order request.");
        }

        return ToConfirmation(existing);
    }

    private static PublicOrderConfirmationDto ToConfirmation(Order order) =>
        new()
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            OrderType = order.OrderType,
            OrderStatus = order.OrderStatus,
            Subtotal = order.Subtotal,
            DiscountAmount = order.DiscountAmount,
            TaxAmount = order.TaxAmount,
            DeliveryFee = order.DeliveryFee,
            TotalAmount = order.TotalAmount,
            CurrencyCode = order.CurrencyCode,
            CreatedAt = order.CreatedAt,
            // Fresh orders keep the requested line order; replayed orders are read back from the database.
            Items = order.OrderItems
                .Select(item => OrderItemDisplayProjection.ToConfirmationItemDto(item, order.ResolvedLocale))
                .ToList()
                .AsReadOnly()
        };

    private static string? TrimToOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
