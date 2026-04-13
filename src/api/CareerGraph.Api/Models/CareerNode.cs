using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CareerGraph.Api.Models;

public class CareerNode
{
    [Key]
    public Guid Id { get; set; }

    public string SocCode { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? CareerCluster { get; set; }

    public string? EducationLevel { get; set; }

    public decimal? MedianSalaryUsd { get; set; }

    public int? ExperienceYearsTypical { get; set; }

    public bool BrightOutlook { get; set; }

    public string? Metadata { get; set; }

    public string Source { get; set; } = "onet";

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
