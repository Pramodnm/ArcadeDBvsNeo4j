using Application.Interfaces;
using Application.Queries;
using Domain.Entities;
using Moq;

namespace IntegrationTests;

public class TopologyServiceTests
{
    [Fact]
    public async Task GetServiceImpactQuery_ReturnsExpectedDownstreamServices()
    {
        // Arrange
        var mockRepo = new Mock<ITopologyRepository>();
        var sampleImpact = new List<ServiceImpact>
        {
            new("svc-payment", "PaymentGateway", "Core", "HEALTHY", "k8s-node-02.prod.internal", 1),
            new("svc-inventory", "InventoryService", "Internal", "HEALTHY", "k8s-node-01.prod.internal", 1)
        };

        mockRepo
            .Setup(r => r.GetDownstreamImpactAsync("svc-order", 3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(sampleImpact);

        var handler = new GetServiceImpactQueryHandler(mockRepo.Object);

        // Act
        var result = await handler.HandleAsync("svc-order", 3);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, s => s.ServiceId == "svc-payment");
        Assert.Contains(result, s => s.ServiceId == "svc-inventory");
    }

    [Fact]
    public async Task GetTopologySummaryQuery_ReturnsAllMicroservices()
    {
        // Arrange
        var mockRepo = new Mock<ITopologyRepository>();
        var sampleServices = new List<MicroserviceEntity>
        {
            new("svc-api-gateway", "ApiGateway", "Edge", "Go", "HEALTHY"),
            new("svc-order", "OrderService", "Core", "C# .NET 10", "DEGRADED")
        };

        mockRepo
            .Setup(r => r.GetAllServicesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(sampleServices);

        var handler = new GetTopologySummaryQueryHandler(mockRepo.Object);

        // Act
        var result = await handler.HandleAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Equal("svc-api-gateway", result[0].Id);
    }
}

