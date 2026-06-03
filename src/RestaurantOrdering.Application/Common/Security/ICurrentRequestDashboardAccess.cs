namespace RestaurantOrdering.Application.Common.Security;

public interface ICurrentRequestDashboardAccess
{
    UserDashboardAccessContext? Context { get; }

    void SetContext(UserDashboardAccessContext context);
}
