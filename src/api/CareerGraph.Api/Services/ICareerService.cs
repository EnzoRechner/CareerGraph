using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CareerGraph.Api.Models;
using CareerGraph.Api.Models.Dtos;

namespace CareerGraph.Api.Services;

public interface ICareerService
{
    Task<CareerNode?> GetCareerAsync(Guid id);
    Task<IEnumerable<CareerNode>> SearchAsync(string query, int limit = 20);
    Task<GraphDto?> GetNeighbourhoodAsync(Guid id, int depth = 2, int maxDepth = 3);
    Task<IEnumerable<ClusterSummaryDto>> GetClustersAsync();
    Task<PathDto?> FindPathAsync(Guid fromId, Guid toId, int maxDepth = 3);
}
