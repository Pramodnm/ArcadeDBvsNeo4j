using Application.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Api.BackgroundServices;

public class TelemetryIngestionBackgroundService : BackgroundService
{
    private readonly ITopologyRepository _repository;
    private readonly ILogger<TelemetryIngestionBackgroundService> _logger;

    public TelemetryIngestionBackgroundService(
        ITopologyRepository repository,
        ILogger<TelemetryIngestionBackgroundService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ArcadeDB Telemetry Ingestion Background Service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Periodically update telemetry heartbeat
                await _repository.IngestTelemetryAsync("svc-order", "HEALTHY", stoppingToken);
                _logger.LogDebug("Emitted periodic telemetry heartbeat to ArcadeDB graph.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Telemetry ingestion pass encountered an error.");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
