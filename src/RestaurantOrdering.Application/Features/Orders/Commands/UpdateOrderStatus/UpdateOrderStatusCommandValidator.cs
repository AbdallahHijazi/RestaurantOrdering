using FluentValidation;

namespace RestaurantOrdering.Application.Features.Orders.Commands.UpdateOrderStatus;

public sealed class UpdateOrderStatusCommandValidator : AbstractValidator<UpdateOrderStatusCommand>
{
    public UpdateOrderStatusCommandValidator()
    {
        RuleFor(x => x.RestaurantId)
            .NotEmpty();

        RuleFor(x => x.OrderId)
            .NotEmpty();

        RuleFor(x => x.NewStatus)
            .IsInEnum();
    }
}
