using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CareerGraph.Api.Models;

namespace CareerGraph.Api.Models.Configurations;

public class CareerEdgeConfiguration : IEntityTypeConfiguration<CareerEdge>
{
    public void Configure(EntityTypeBuilder<CareerEdge> builder)
    {
        builder.ToTable("career_edges");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.RelationshipType).HasMaxLength(30).IsRequired();
        builder.Property(e => e.Weight).IsRequired();
        builder.Property(e => e.Source).HasMaxLength(20).IsRequired();
    }
}
