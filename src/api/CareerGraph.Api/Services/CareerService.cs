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

    public async Task<PathDto?> FindPathAsync(Guid fromId, Guid toId, int maxDepth = 6)
    {
        if (fromId == toId) return new PathDto { NodeIds = new List<Guid> { fromId } };

        var allEdges = await _db.CareerEdges.ToListAsync();
        var adj = new Dictionary<Guid, List<(Guid neighbor, double weight)>>();
        foreach (var e in allEdges)
        {
            double weight = e.Weight.HasValue ? (double)e.Weight.Value : 1.0;
            if (!adj.ContainsKey(e.SourceNodeId)) adj[e.SourceNodeId] = new List<(Guid,double)>();
            if (!adj.ContainsKey(e.TargetNodeId)) adj[e.TargetNodeId] = new List<(Guid,double)>();
            adj[e.SourceNodeId].Add((e.TargetNodeId, weight));
            adj[e.TargetNodeId].Add((e.SourceNodeId, weight));
        }

        var dist = new Dictionary<Guid, double>();
        var prev = new Dictionary<Guid, Guid>();
        var depth = new Dictionary<Guid, int>();
        var pq = new PriorityQueue<Guid, double>();

        dist[fromId] = 0;
        depth[fromId] = 0;
        pq.Enqueue(fromId, 0);

        while (pq.TryDequeue(out var current, out var currentDist))
        {
            if (current == toId) break;
            if (!adj.TryGetValue(current, out var neighbours)) continue;
            if (depth[current] >= maxDepth) continue;

            foreach (var (nbr, w) in neighbours)
            {
                double newDist = currentDist + w;
                if (!dist.TryGetValue(nbr, out var existingDist) || newDist < existingDist)
                {
                    dist[nbr] = newDist;
                    prev[nbr] = current;
                    depth[nbr] = depth[current] + 1;
                    pq.Enqueue(nbr, newDist);
                }
            }
        }

        if (!dist.ContainsKey(toId)) return null;

        var path = new List<Guid>();
        var cur = toId;
        while (cur != fromId)
        {
            path.Add(cur);
            cur = prev[cur];
        }
        path.Add(fromId);
        path.Reverse();

        return new PathDto { NodeIds = path };
    }
}
