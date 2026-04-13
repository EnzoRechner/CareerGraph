using System;
using System.Collections.Generic;

namespace CareerGraph.Api.Models.Dtos;

public class PathDto
{
    public List<Guid> NodeIds { get; set; } = new();
}