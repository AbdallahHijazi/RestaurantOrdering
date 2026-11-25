namespace RestaurantOrdering.Application.Common.Security;

public sealed class CurrentRequestDashboardAccess : ICurrentRequestDashboardAccess
{
    public UserDashboardAccessContext? Context { get; private set; }

    public void SetContext(UserDashboardAccessContext context)
    {
        Context = context;
    }
}
