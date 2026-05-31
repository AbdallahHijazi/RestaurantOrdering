using FluentValidation;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder;

public sealed class CreatePublicOrderCommandValidator : AbstractValidator<CreatePublicOrderCommand>
{
    public CreatePublicOrderCommandValidator()
    {
        RuleFor(x => x.RestaurantSlug)
            .NotEmpty()
            .Must(slug => !string.IsNullOrWhiteSpace(slug))
            .WithMessage("Restaurant slug is required.")
            .MaximumLength(150);

        RuleFor(x => x.GuestName)
            .NotEmpty()
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("Guest name is required.")
            .MaximumLength(100);

        RuleFor(x => x.GuestPhone)
            .NotEmpty()
            .Must(phone => !string.IsNullOrWhiteSpace(phone))
            .WithMessage("Guest phone is required.")
            .MaximumLength(20);

        RuleFor(x => x.OrderType)
            .IsInEnum();

        RuleFor(x => x.DeliveryAddress)
            .Must(address => !string.IsNullOrWhiteSpace(address))
            .WithMessage("Delivery address is required.")
            .When(x => x.OrderType == OrderType.Delivery);

        RuleFor(x => x.DeliveryAddress)
            .MaximumLength(400)
            .When(x => !string.IsNullOrWhiteSpace(x.DeliveryAddress));

        RuleFor(x => x.Notes)
            .MaximumLength(500)
            .When(x => !string.IsNullOrWhiteSpace(x.Notes));

        RuleFor(x => x.Items)
            .NotEmpty()
            .Must(items => items is null || items.Count <= 100)
            .WithMessage("An order cannot contain more than 100 item lines.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.MenuItemId)
                .NotEmpty();

            item.RuleFor(i => i.Quantity)
                .GreaterThan(0);

            item.RuleFor(i => i.Notes)
                .MaximumLength(200)
                .When(i => !string.IsNullOrWhiteSpace(i.Notes));
        });
    }
}
