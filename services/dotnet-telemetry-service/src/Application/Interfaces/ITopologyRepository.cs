using Domain.Entities;

namespace Application.Interfaces;

public interface ITopologyRepository
{
    Task<IReadOnlyList<ServiceImpact>> GetDownstreamImpactAsync(string rootServiceId, int maxDepth = 3, CancellationToken ct = default);
    Task<IReadOnlyList<MicroserviceEntity>> GetAllServicesAsync(CancellationToken ct = default);
    Task IngestTelemetryAsync(string serviceId, string status, CancellationToken ct = default);
}

public interface IArcadeDbHttpClient
{
    Task<string> ExecuteSqlAsync(string sql, object? parameters = null, CancellationToken ct = default);
    Task<string> ExecuteCypherAsync(string cypher, object? parameters = null, CancellationToken ct = default);
    Task<bool> IsReadyAsync(CancellationToken ct = default);
}
