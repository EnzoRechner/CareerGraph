using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CareerGraph.Api.Data;
using CareerGraph.Api.Models;
using CareerGraph.Api.Models.Dtos;

namespace CareerGraph.Api.Services;

public class CareerService : ICareerService
{
    private readonly CareerGraphDbContext _db;

    public CareerService(CareerGraphDbContext db) => _db = db;

    public async Task<CareerNode?> GetCareerAsync(Guid id)
    {
        return await _db.CareerNodes.FindAsync(id);
    }

    public async Task<IEnumerable<CareerNode>> SearchAsync(string query, int limit = 20)
    {
        return await _db.CareerNodes
            .Where(n => EF.Functions.ILike(n.Title, $"%{query}%"))
            .Take(limit)
            .ToListAsync();
    }

    public async Task<GraphDto?> GetNeighbourhoodAsync(Guid id, int depth = 2, int maxDepth = 3)
    {
        if (depth <= 0) return null;
        if (depth > maxDepth) depth = maxDepth;

        var visited = new HashSet<Guid> { id };
        var frontier = new Queue<Guid>();
        frontier.Enqueue(id);

        var nodes = new List<CareerNode>();
        var edges = new List<CareerEdge>();

        while (frontier.Count > 0 && depth > 0)
        {
            var nextFrontier = new Queue<Guid>();
            var currentBatch = frontier.ToArray();

            var edgeBatch = await _db.CareerEdges
                .Where(e => currentBatch.Contains(e.SourceNodeId) || currentBatch.Contains(e.TargetNodeId))
                .ToListAsync();

            edges.AddRange(edgeBatch);

            foreach (var e in edgeBatch)
            {
                if (!visited.Contains(e.SourceNodeId)) { visited.Add(e.SourceNodeId); nextFrontier.Enqueue(e.SourceNodeId); }
                if (!visited.Contains(e.TargetNodeId)) { visited.Add(e.TargetNodeId); nextFrontier.Enqueue(e.TargetNodeId); }
            }

            var nextIds = nextFrontier.ToList();
            if (nextIds.Any())
            {
                var newNodes = await _db.CareerNodes.Where(n => nextIds.Contains(n.Id)).ToListAsync();
                nodes.AddRange(newNodes);
            }

            frontier = nextFrontier;
            depth--;
        }

        var root = await _db.CareerNodes.FindAsync(id);
        if (root != null) nodes.Insert(0, root);

        return new GraphDto { FocusNodeId = id, Nodes = nodes, Edges = edges };
    }

    public async Task<IEnumerable<ClusterSummaryDto>> GetClustersAsync()
    {
        return await _db.CareerNodes
            .GroupBy(n => n.CareerCluster)
            .Select(g => new ClusterSummaryDto { ClusterName = g.Key ?? "Other", NodeCount = g.Count() })
            .ToListAsync();
    }

    public async Task<PathDto?> FindPathAsync(Guid fromId, Guid toId, int maxDepth = 3)
    {
        if (fromId == toId) return new PathDto { NodeIds = new List<Guid> { fromId } };

        var allEdges = await _db.CareerEdges.ToListAsync();
        var adj = new Dictionary<Guid, List<Guid>>();
        foreach (var e in allEdges)
        {
            if (!adj.ContainsKey(e.SourceNodeId)) adj[e.SourceNodeId] = new List<Guid>();
            if (!adj.ContainsKey(e.TargetNodeId)) adj[e.TargetNodeId] = new List<Guid>();
            adj[e.SourceNodeId].Add(e.TargetNodeId);
            adj[e.TargetNodeId].Add(e.SourceNodeId);
        }

        var queue = new Queue<(Guid node, List<Guid> path)>();
        var visited = new HashSet<Guid>();
        queue.Enqueue((fromId, new List<Guid> { fromId }));
        visited.Add(fromId);

        while (queue.Count > 0)
        {
            var (current, path) = queue.Dequeue();
            if (path.Count > maxDepth) continue;
            if (adj.TryGetValue(current, out var neighbours))
            {
                foreach (var neigh in neighbours)
                {
                    if (visited.Contains(neigh)) continue;
                    var newPath = new List<Guid>(path) { neigh };
                    if (neigh == toId) return new PathDto { NodeIds = newPath };
                    visited.Add(neigh);
                    queue.Enqueue((neigh, newPath));
                }
            }
        }

        return null;
    }
}
