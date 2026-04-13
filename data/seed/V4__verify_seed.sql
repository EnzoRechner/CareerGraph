# data/seed/V4__verify_seed.sql
-- Sanity checks for the seeded data.

-- 1. Total nodes
SELECT 'career_nodes' AS entity, COUNT(*) AS total FROM career_nodes;

-- 2. Total edges
SELECT 'career_edges' AS entity, COUNT(*) AS total FROM career_edges;

-- 3. Nodes per cluster
SELECT career_cluster, COUNT(*) AS node_count
FROM career_nodes
GROUP BY career_cluster
ORDER BY node_count DESC;

-- 4. Spot check a known node
SELECT id, soc_code, title, education_level, experience_years_typical, career_cluster
FROM career_nodes
WHERE title ILIKE '%elementary%teacher%' OR soc_code LIKE '25-2021%';

-- 5. Related edges for that node
SELECT tgt.title AS leads_to, ce.weight, ce.years_experience_delta
FROM career_edges ce
JOIN career_nodes src ON src.id = ce.source_node_id
JOIN career_nodes tgt ON tgt.id = ce.target_node_id
WHERE src.soc_code LIKE '25-2021%'
ORDER BY ce.weight;

-- 6. Orphan nodes (no edges)
SELECT cn.title, cn.soc_code
FROM career_nodes cn
LEFT JOIN career_edges ce_out ON ce_out.source_node_id = cn.id
LEFT JOIN career_edges ce_in ON ce_in.target_node_id = cn.id
WHERE ce_out.id IS NULL AND ce_in.id IS NULL;

-- 7. Weight distribution
SELECT ROUND(weight, 1) AS weight_bucket, COUNT(*) AS edge_count
FROM career_edges
GROUP BY ROUND(weight, 1)
ORDER BY weight_bucket;

-- 8. Metadata populated
SELECT COUNT(*) AS nodes_with_alt_titles
FROM career_nodes
WHERE metadata->>'alternateTitles' IS NOT NULL
  AND metadata->>'alternateTitles' <> '[]';
