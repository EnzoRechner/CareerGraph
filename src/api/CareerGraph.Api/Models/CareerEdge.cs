using System;
using System.ComponentModel.DataAnnotations;

namespace CareerGraph.Api.Models;

public class CareerEdge
{
    [Key]
    public Guid Id { get; set; }

    public Guid SourceNodeId { get; set; }

    public Guid TargetNodeId { get; set; }

    public string RelationshipType { get; set; } = "related";

    public decimal Weight { get; set; } = 1.0m;

    public int? YearsExperienceDelta { get; set; }

    public string[]? RequiredCertifications { get; set; }

    public decimal? SalaryDeltaUsd { get; set; }

    public string? Description { get; set; }

    public string Source { get; set; } = "onet";

    public DateTime CreatedAt { get; set; }
}
