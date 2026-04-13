using System;
using System.Collections.Generic;
using CareerGraph.Api.Models;

namespace CareerGraph.Api.Models.Dtos;

public class GraphDto
{
    public Guid FocusNodeId { get; set; }
    public List<CareerNode> Nodes { get; set; } = new();
    public List<CareerEdge> Edges { get; set; } = new();
}
