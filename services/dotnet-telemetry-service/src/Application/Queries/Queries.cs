using Application.Interfaces;
using Domain.Entities;

namespace Application.Queries;

public class GetServiceImpactQueryHandler
{
    private readonly ITopologyRepository _repository;

    public GetServiceImpactQueryHandler(ITopologyRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<ServiceImpact>> HandleAsync(string serviceId, int depth = 3, CancellationToken ct = default)
    {
        return await _repository.GetDownstreamImpactAsync(serviceId, depth, ct);
    }
}

public class GetTopologySummaryQueryHandler
{
    private readonly ITopologyRepository _repository;

    public GetTopologySummaryQueryHandler(ITopologyRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<MicroserviceEntity>> HandleAsync(CancellationToken ct = default)
    {
        return await _repository.GetAllServicesAsync(ct);
    }
}
