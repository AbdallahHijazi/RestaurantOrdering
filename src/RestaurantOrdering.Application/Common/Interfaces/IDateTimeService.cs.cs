using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RestaurantOrdering.Application.Common.Interfaces
{
    public interface IDateTimeService
    {
        DateTime UtcNow { get; }
    }
}
