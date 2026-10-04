using System.Net.Http.Headers;
using System.Text;
using Api.BackgroundServices;
using Application.Interfaces;
using Application.Queries;
using Infrastructure.Clients;
using Infrastructure.Repositories;
using Neo4j.Driver;

var builder = WebApplication.CreateBuilder(args);

// 1. Register Typed Resilient HttpClient for ArcadeDB REST API (with Polly v8 resilience)
builder.Services.AddHttpClient<IArcadeDbHttpClient, ArcadeDbHttpClient>(client =>
{
    var baseUrl = builder.Configuration["ArcadeDb:BaseUrl"] ?? "http://localhost:2480/api/v1/";
    var user = builder.Configuration["ArcadeDb:Username"] ?? "root";
    var pass = builder.Configuration["ArcadeDb:Password"] ?? "arcadepassword";

    client.BaseAddress = new Uri(baseUrl);
    var authBytes = Encoding.ASCII.GetBytes($"{user}:{pass}");
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));
})
.AddStandardResilienceHandler(options =>
{
    options.Retry.MaxRetryAttempts = 3;
    options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
    options.CircuitBreaker.FailureRatio = 0.5;
});

// 2. Register Neo4j Bolt Driver pointing to ArcadeDB Bolt Plugin (port 7687)
builder.Services.AddSingleton<IDriver>(_ =>
{
    var boltUri = builder.Configuration["ArcadeDb:BoltUri"] ?? "bolt://localhost:7687";
    var user = builder.Configuration["ArcadeDb:Username"] ?? "root";
    var pass = builder.Configuration["ArcadeDb:Password"] ?? "arcadepassword";

    return GraphDatabase.Driver(boltUri, AuthTokens.Basic(user, pass), o =>
    {
        o.WithMaxConnectionPoolSize(50);
        o.WithConnectionTimeout(TimeSpan.FromSeconds(5));
    });
});

// 3. Register Application Services & Repositories
builder.Services.AddScoped<ITopologyRepository, Neo4jBoltTopologyRepository>();
builder.Services.AddScoped<GetServiceImpactQueryHandler>();
builder.Services.AddScoped<GetTopologySummaryQueryHandler>();

// 4. Register Background Telemetry Ingestion Service
builder.Services.AddHostedService<TelemetryIngestionBackgroundService>();

var app = builder.Build();

// Endpoints
app.MapGet("/health", async (IArcadeDbHttpClient arcadeClient, CancellationToken ct) =>
{
    var isReady = await arcadeClient.IsReadyAsync(ct);
    return Results.Ok(new
    {
        Status = "ONLINE",
        Service = "DotNet-10-Telemetry-Microservice",
        ArcadeDbConnected = isReady,
        Framework = ".NET 10.0"
    });
});

app.MapGet("/api/topology/services", async (GetTopologySummaryQueryHandler handler, CancellationToken ct) =>
{
    var services = await handler.HandleAsync(ct);
    return Results.Ok(services);
});

app.MapGet("/api/topology/impact/{serviceId}", async (string serviceId, int? depth, GetServiceImpactQueryHandler handler, CancellationToken ct) =>
{
    var impact = await handler.HandleAsync(serviceId, depth ?? 3, ct);
    return Results.Ok(new
    {
        RootServiceId = serviceId,
        MaxDepth = depth ?? 3,
        DownstreamImpact = impact
    });
});

app.Run();

public partial class Program { }

