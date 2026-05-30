using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;

namespace RestaurantOrdering.Application.Features.MenuItems.Commands.DeleteMenuItem;

public sealed class DeleteMenuItemCommandHandler : IRequestHandler<DeleteMenuItemCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public DeleteMenuItemCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<Unit> Handle(
        DeleteMenuItemCommand request,
        CancellationToken cancellationToken)
    {
        var menuItem = await _context.MenuItems
            .FirstOrDefaultAsync(
                item => item.Id == request.MenuItemId && item.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (menuItem is null)
        {
            throw new NotFoundException("MenuItem", request.MenuItemId);
        }

        menuItem.IsDeleted = true;
        menuItem.IsActive = false;
        menuItem.IsAvailable = false;
        menuItem.UpdatedAt = _dateTimeService.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
