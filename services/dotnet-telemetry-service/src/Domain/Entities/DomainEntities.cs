namespace Domain.Entities;

public record MicroserviceEntity(
    string Id,
    string Name,
    string Tier,
    string Language,
    string Status
);

public record HostNodeEntity(
    string Id,
    string Hostname,
    string Zone,
    string Region,
    int CpuCores
);

public record DatabaseClusterEntity(
    string Id,
    string Name,
    string Engine,
    bool IsLeader
);

public record IncidentEntity(
    string Id,
    string Title,
    string Severity,
    string Summary,
    string RootCause,
    DateTime CreatedAt
);

public record ServiceImpact(
    string ServiceId,
    string ServiceName,
    string Tier,
    string Status,
    string? Hostname,
    int DepthHop
);
