using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Common.Translation;

public static class TranslationJobLease
{
    public static void ApplyClaim(
        TranslationJob job,
        DateTime claimedAt,
        DateTime leaseExpiresAt,
        string workerId)
    {
        job.Status = TranslationJobStatus.Running;
        job.ClaimedAt = claimedAt;
        job.LeaseExpiresAt = leaseExpiresAt;
        job.WorkerId = workerId;
    }

    public static void Clear(TranslationJob job)
    {
        job.ClaimedAt = null;
        job.LeaseExpiresAt = null;
        job.WorkerId = null;
    }

    public static bool IsActiveClaim(TranslationJob job, string workerId, DateTime utcNow) =>
        job.Status == TranslationJobStatus.Running
        && string.Equals(job.WorkerId, workerId, StringComparison.Ordinal)
        && job.LeaseExpiresAt.HasValue
        && job.LeaseExpiresAt.Value > utcNow;
}
