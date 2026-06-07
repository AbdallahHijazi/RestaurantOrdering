using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
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

    public CreatePublicOrderCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
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
                item.IsAvailable)
            .ToListAsync(cancellationToken);

        var menuItemsById = menuItems.ToDictionary(item => item.Id);

        var utcNow = _dateTimeService.UtcNow;
        var orderItems = new List<OrderItem>();
        decimal subtotal = 0m;

        foreach (var requestItem in request.Items)
        {
            if (!menuItemsById.TryGetValue(requestItem.MenuItemId, out var menuItem))
            {
                throw new NotFoundException("MenuItem", requestItem.MenuItemId);
            }

            var unitPrice = menuItem.DiscountPrice ?? menuItem.Price;
            var totalPrice = unitPrice * requestItem.Quantity;
            subtotal += totalPrice;

            orderItems.Add(new OrderItem
            {
                MenuItemId = requestItem.MenuItemId,
                ItemNameAr = menuItem.NameAr,
                ItemNameEn = menuItem.NameEn,
                UnitPrice = unitPrice,
                Quantity = requestItem.Quantity,
                TotalPrice = totalPrice,
                Notes = TrimToOptional(requestItem.Notes),
                CreatedAt = utcNow
            });
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
            IsDeleted = false,
            CreatedAt = utcNow,
            OrderItems = orderItems
        };

        _context.Orders.Add(order);

        await _context.SaveChangesAsync(cancellationToken);

        return new PublicOrderConfirmationDto
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
            Items = orderItems
                .Select(item => new PublicOrderConfirmationItemDto
                {
                    MenuItemId = item.MenuItemId,
                    ItemNameAr = item.ItemNameAr,
                    ItemNameEn = item.ItemNameEn,
                    UnitPrice = item.UnitPrice,
                    Quantity = item.Quantity,
                    TotalPrice = item.TotalPrice,
                    Notes = item.Notes
                })
                .ToList()
                .AsReadOnly()
        };
    }

    private static string? TrimToOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
