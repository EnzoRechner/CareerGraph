using Microsoft.EntityFrameworkCore;
using CareerGraph.Api.Models;
using CareerGraph.Api.Models.Configurations;

namespace CareerGraph.Api.Data;

public class CareerGraphDbContext : DbContext
{
    public CareerGraphDbContext(DbContextOptions<CareerGraphDbContext> options)
        : base(options)
    {
    }

    public DbSet<CareerNode> CareerNodes => Set<CareerNode>();
    public DbSet<CareerEdge> CareerEdges => Set<CareerEdge>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Domain model configurations
        modelBuilder.ApplyConfiguration(new CareerNodeConfiguration());
        modelBuilder.ApplyConfiguration(new CareerEdgeConfiguration());
    }
}
