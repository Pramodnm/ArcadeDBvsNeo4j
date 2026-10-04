using System.Net.Http.Json;
using System.Text.Json;
using Application.Interfaces;

namespace Infrastructure.Clients;

public class ArcadeDbHttpClient : IArcadeDbHttpClient
{
    private readonly HttpClient _httpClient;
    private readonly string _database;

    public ArcadeDbHttpClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _database = "EnterpriseTopology";
    }

    public async Task<string> ExecuteCypherAsync(string cypher, object? parameters = null, CancellationToken ct = default)
    {
        var payload = new
        {
            language = "cypher",
            command = cypher,
            @params = parameters ?? new { }
        };

        var response = await _httpClient.PostAsJsonAsync($"query/{_database}", payload, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(ct);
    }

    public async Task<string> ExecuteSqlAsync(string sql, object? parameters = null, CancellationToken ct = default)
    {
        var payload = new
        {
            language = "sql",
            command = sql,
            @params = parameters ?? new { }
        };

        var response = await _httpClient.PostAsJsonAsync($"command/{_database}", payload, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(ct);
    }

    public async Task<bool> IsReadyAsync(CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("ready", ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
