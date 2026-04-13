using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Threading.Tasks;

namespace CareerGraph.Api.Controllers;

[ApiController]
[Route("api/v1/health")]
public class HealthEndpoints : ControllerBase
{
    private readonly IConfiguration _config;
    public HealthEndpoints(IConfiguration config) => _config = config;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var connString = _config.GetConnectionString("Default");
        var healthy = false;
        try
        {
            await using var conn = new NpgsqlConnection(connString);
            await conn.OpenAsync();
            healthy = true;
        }
        catch
        {
            healthy = false;
        }

        return Ok(new
        {
            status = healthy ? "healthy" : "unhealthy",
            dbConnected = healthy
        });
    }
}
