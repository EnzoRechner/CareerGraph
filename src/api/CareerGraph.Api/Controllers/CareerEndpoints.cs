using Microsoft.AspNetCore.Mvc;
using CareerGraph.Api.Services;
using System;
using System.Threading.Tasks;

namespace CareerGraph.Api.Controllers;

[ApiController]
[Route("api/v1/careers")]
public class CareerEndpoints : ControllerBase
{
    private readonly ICareerService _service;
    public CareerEndpoints(ICareerService service) => _service = service;

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCareer(Guid id)
    {
        var node = await _service.GetCareerAsync(id);
        return node != null ? Ok(node) : NotFound();
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(string q, int limit = 20)
    {
        var results = await _service.SearchAsync(q, limit);
        return Ok(results);
    }

    [HttpGet("{id}/neighbourhood")]
    public async Task<IActionResult> GetNeighbourhood(Guid id, int depth = 2, int maxDepth = 3)
    {
        var graph = await _service.GetNeighbourhoodAsync(id, depth, maxDepth);
        return graph != null ? Ok(graph) : NotFound();
    }

    [HttpGet("clusters")]
    public async Task<IActionResult> GetClusters()
    {
        var clusters = await _service.GetClustersAsync();
        return Ok(clusters);
    }

    [HttpGet("path")]
    public async Task<IActionResult> GetPath(Guid fromId, Guid toId, int maxDepth = 3)
    {
        var path = await _service.FindPathAsync(fromId, toId, maxDepth);
        return path != null ? Ok(path) : NotFound();
    }
}
