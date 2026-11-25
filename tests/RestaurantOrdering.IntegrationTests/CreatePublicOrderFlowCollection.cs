using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

[CollectionDefinition("CreatePublicOrderFlow", DisableParallelization = true)]
public sealed class CreatePublicOrderFlowCollection : ICollectionFixture<TestWebApplicationFactory>;
