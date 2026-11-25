using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RestaurantOrdering.Application.Common.Interfaces;

namespace RestaurantOrdering.Infrastructure.Translation;

public sealed class TranslationJobWorker : BackgroundService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IOptions<TranslationWorkerOptions> _options;
    private readonly ILogger<TranslationJobWorker> _logger;

    public TranslationJobWorker(
        IServiceScopeFactory serviceScopeFactory,
        IOptions<TranslationWorkerOptions> options,
        ILogger<TranslationJobWorker> logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Value.Enabled)
        {
            _logger.LogInformation("Translation job worker is disabled.");
            return;
        }

        var pollingInterval = TimeSpan.FromSeconds(_options.Value.PollingIntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();
                await executor.ProcessAvailableJobsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Unexpected error in translation job worker loop.");
            }

            try
            {
                await Task.Delay(pollingInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("Translation job worker is stopping.");
    }
}
