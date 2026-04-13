using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CareerGraph.Api.Models;

namespace CareerGraph.Api.Models.Configurations;

public class CareerNodeConfiguration : IEntityTypeConfiguration<CareerNode>
{
    public void Configure(EntityTypeBuilder<CareerNode> builder)
    {
        builder.ToTable("career_nodes");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.SocCode).IsRequired().HasMaxLength(10);
        builder.Property(n => n.Title).IsRequired().HasMaxLength(200);
        builder.Property(n => n.CareerCluster).HasMaxLength(100);
        builder.Property(n => n.EducationLevel).HasMaxLength(50);
        builder.Property(n => n.Metadata).HasColumnType("jsonb");
        builder.Property(n => n.Source).HasMaxLength(20).IsRequired();
    }
}
