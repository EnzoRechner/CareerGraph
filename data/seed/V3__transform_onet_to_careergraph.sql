# data/seed/V3__transform_onet_to_careergraph.sql
-- Transform staged O*NET data into CareerGraph tables.
-- Requires the staging schema to exist and contain the O*NET tables.
-- Run this after V2__import_onet_staging.sh.

BEGIN;

-- 1. Create nodes
INSERT INTO public.career_nodes (soc_code, title, description, source)
SELECT
    od.onetsoc_code,
    od.title,
    od.description,
    'onet'
FROM staging.occupation_data od
ON CONFLICT (soc_code) DO NOTHING;

-- 2. Enrich with job zone (experience years)
UPDATE public.career_nodes cn
SET experience_years_typical = CASE jz.job_zone
        WHEN 1 THEN 0
        WHEN 2 THEN 1
        WHEN 3 THEN 3
        WHEN 4 THEN 5
        WHEN 5 THEN 8
        ELSE NULL
    END
FROM staging.job_zones jz
WHERE cn.soc_code = jz.onetsoc_code;

-- 3. Enrich with education level
UPDATE public.career_nodes cn
SET education_level = subq.category_description
FROM (
    SELECT DISTINCT ON (ete.onetsoc_code)
        ete.onetsoc_code,
        cat.category_description
    FROM staging.education_training_experience ete
    JOIN staging.ete_categories cat
        ON cat.element_id = ete.element_id
        AND cat.scale_id = ete.scale_id
        AND cat.category = ete.category
    WHERE ete.element_id = '2.D.1'
      AND ete.scale_id = 'RL'
    ORDER BY ete.onetsoc_code, ete.data_value DESC
) subq
WHERE cn.soc_code = subq.onetsoc_code;

-- 4. Set career cluster from SOC major group
UPDATE public.career_nodes
SET career_cluster = CASE LEFT(soc_code, 2)
    WHEN '11' THEN 'Management'
    WHEN '13' THEN 'Business & Financial'
    WHEN '15' THEN 'Computer & Mathematical'
    WHEN '17' THEN 'Architecture & Engineering'
    WHEN '19' THEN 'Life, Physical & Social Science'
    WHEN '21' THEN 'Community & Social Service'
    WHEN '23' THEN 'Legal'
    WHEN '25' THEN 'Education, Training & Library'
    WHEN '27' THEN 'Arts, Design, Entertainment & Media'
    WHEN '29' THEN 'Healthcare Practitioners'
    WHEN '31' THEN 'Healthcare Support'
    WHEN '33' THEN 'Protective Services'
    WHEN '35' THEN 'Food Preparation & Serving'
    WHEN '37' THEN 'Building & Grounds Maintenance'
    WHEN '39' THEN 'Personal Care & Service'
    WHEN '41' THEN 'Sales'
    WHEN '43' THEN 'Office & Administrative Support'
    WHEN '45' THEN 'Farming, Fishing & Forestry'
    WHEN '47' THEN 'Construction & Extraction'
    WHEN '49' THEN 'Installation, Maintenance & Repair'
    WHEN '51' THEN 'Production'
    WHEN '53' THEN 'Transportation & Material Moving'
    WHEN '55' THEN 'Military Specific'
    ELSE 'Other'
END;

-- 5. Create edges from related occupations
INSERT INTO public.career_edges (source_node_id, target_node_id, relationship_type, source)
SELECT
    src.id,
    tgt.id,
    'related',
    'onet'
FROM staging.related_occupations ro
JOIN public.career_nodes src ON src.soc_code = ro.onetsoc_code
JOIN public.career_nodes tgt ON tgt.soc_code = ro.related_onetsoc_code
WHERE src.id <> tgt.id
  AND ro.relatedness_tier IN ('Primary-Short', 'Primary-Long')
ON CONFLICT ON CONSTRAINT uq_career_edge DO NOTHING;

-- 6. Weight edges and experience delta
UPDATE public.career_edges ce
SET weight = base_weight.tier_weight
    + ABS(COALESCE(tgt.experience_years_typical, 3) - COALESCE(src.experience_years_typical, 3)) * 0.1,
    years_experience_delta = GREATEST(
        COALESCE(tgt.experience_years_typical, 0) - COALESCE(src.experience_years_typical, 0),
        0
    )
FROM public.career_nodes src,
     public.career_nodes tgt,
     (
         SELECT ro.onetsoc_code, ro.related_onetsoc_code,
                CASE ro.relatedness_tier
                    WHEN 'Primary-Short' THEN 1.0 + (ro.related_index * 0.08)
                    WHEN 'Primary-Long'  THEN 1.5 + (ro.related_index * 0.08)
                    WHEN 'Supplemental'  THEN 2.5 + (ro.related_index * 0.08)
                    ELSE 3.0
                END AS tier_weight
         FROM staging.related_occupations ro
     ) base_weight
WHERE ce.source_node_id = src.id
  AND ce.target_node_id = tgt.id
  AND src.soc_code = base_weight.onetsoc_code
  AND tgt.soc_code = base_weight.related_onetsoc_code;

-- 7. Pack alternate titles into metadata
UPDATE public.career_nodes cn
SET metadata = jsonb_set(
    COALESCE(cn.metadata, '{}'::jsonb),
    '{alternateTitles}',
    COALESCE(
        (SELECT jsonb_agg(at.alternate_title)
         FROM staging.alternate_titles at
         WHERE at.onetsoc_code = cn.soc_code),
        '[]'
    )
);

COMMIT;
