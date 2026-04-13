# O*NET Metadata Expansion — CareerGraph Reference

This document defines the additional O*NET tables that enrich `career_nodes.metadata` JSONB
beyond the core 5 tables. All transformations run as part of the V3 seed script.

Source: https://www.onetcenter.org/dictionary/30.2/mysql/
License: Creative Commons Attribution 4.0 (CC BY 4.0)

---

## The Rosetta Stone: `content_model_reference`

**Table:** `content_model_reference`
**SQL File:** `01_content_model_reference.sql`
**Row Count:** 630

| Column | Type | Description |
|--------|------|-------------|
| `element_id` | Character Varying(20) | Hierarchical outline position (e.g., "2.B.1.a") |
| `element_name` | Character Varying(150) | Human-readable name (e.g., "Reading Comprehension") |
| `description` | Character Varying(1500) | Full description of the element |

**This table is essential.** It maps `element_id` (used in skills, knowledge, abilities, interests,
work_styles, work_values) to human-readable names. Every metadata enrichment query JOINs here.

Element ID hierarchy:
- `1.A.*` = Abilities
- `1.B.*` = Interests  
- `1.C.*` = Work Values / Work Styles
- `2.A.*` = Knowledge
- `2.B.*` = Skills
- `2.D.*` = Education, Training, Experience
- `4.A.*` = Work Activities
- `4.C.*` = Work Context

---

## Shared Table Pattern

The tables `skills`, `knowledge`, `abilities`, `interests`, `work_styles`, and `work_values` 
all share the same column structure:

| Column | Type | Description |
|--------|------|-------------|
| `onetsoc_code` | Character(10) | O*NET-SOC Code |
| `element_id` | Character Varying(20) | Content Model element (JOIN to content_model_reference) |
| `scale_id` | Character Varying(3) | Scale: "IM" = Importance, "LV" = Level |
| `data_value` | Decimal(5,2) | Rating value (typically 1-7 for importance, 0-7 for level) |
| `n` | Decimal(4,0) | Sample size |
| `standard_error` | Decimal(7,4) | Standard error |
| `lower_ci_bound` | Decimal(7,4) | Lower 95% CI |
| `upper_ci_bound` | Decimal(7,4) | Upper 95% CI |
| `recommend_suppress` | Character(1) | "Y" if low precision |
| `not_relevant` | Character(1) | "Y" if not relevant to occupation |
| `date_updated` | Date | Last update date |
| `domain_source` | Character Varying(30) | Data source |

**Key filter:** Use `scale_id = 'IM'` for Importance ratings. This gives a single importance
score per element per occupation. Higher `data_value` = more important.

**Extraction pattern for all shared tables:**

```sql
-- Generic pattern: get top N most important [skills/knowledge/etc.] per occupation
SELECT
    t.onetsoc_code,
    jsonb_agg(
        jsonb_build_object(
            'name', cmr.element_name,
            'importance', t.data_value
        ) ORDER BY t.data_value DESC
    ) AS items
FROM staging.[TABLE_NAME] t
JOIN staging.content_model_reference cmr ON cmr.element_id = t.element_id
WHERE t.scale_id = 'IM'                    -- Importance scale
  AND t.not_relevant <> 'Y'               -- Skip irrelevant
  AND t.recommend_suppress <> 'Y'         -- Skip low-precision
  AND t.data_value >= 3.0                 -- Only meaningfully important items
GROUP BY t.onetsoc_code
```

---

## Table: `skills`

**SQL File:** `16_skills.sql`
**Maps to:** `career_nodes.metadata.skills`
**Element ID prefix:** `2.B.*`

35 skill elements including: Reading Comprehension, Active Listening, Writing, Speaking,
Mathematics, Science, Critical Thinking, Active Learning, Learning Strategies, Monitoring,
Social Perceptiveness, Coordination, Persuasion, Negotiation, Instructing, Service Orientation,
Complex Problem Solving, Operations Analysis, Technology Design, Equipment Selection,
Installation, Programming, Operation Monitoring, Operation and Control, Equipment Maintenance,
Troubleshooting, Repairing, Quality Control Analysis, Judgment and Decision Making,
Systems Analysis, Systems Evaluation, Time Management, Management of Financial Resources,
Management of Material Resources, Management of Personnel Resources.

---

## Table: `knowledge`

**SQL File:** `15_knowledge.sql`  
**Maps to:** `career_nodes.metadata.knowledge`
**Element ID prefix:** `2.A.*`

33 knowledge areas including: Administration and Management, Clerical, Economics and Accounting,
Sales and Marketing, Customer and Personal Service, Personnel and Human Resources, Production
and Processing, Food Production, Computers and Electronics, Engineering and Technology,
Design, Building and Construction, Mechanical, Mathematics, Physics, Chemistry, Biology,
Psychology, Sociology and Anthropology, Geography, Medicine and Dentistry, Therapy and
Counseling, Education and Training, English Language, Foreign Language, Fine Arts, History
and Archeology, Philosophy and Theology, Public Safety and Security, Law and Government,
Telecommunications, Communications and Media, Transportation.

---

## Table: `interests`

**SQL File:** `09_interests.sql`
**Maps to:** `career_nodes.metadata.interests`
**Element ID prefix:** `1.B.*`

Uses the RIASEC model (Holland Codes). Scale_id = 'OI' (Occupational Interest).
Each occupation has 6 scores, one per RIASEC dimension:
- **R**ealistic — practical, hands-on
- **I**nvestigative — analytical, intellectual
- **A**rtistic — creative, expressive
- **S**ocial — helping, teaching
- **E**nterprising — leading, persuading
- **C**onventional — organizing, data-focused

**Special extraction** (different from generic pattern):

```sql
-- RIASEC interest profile per occupation
SELECT
    i.onetsoc_code,
    jsonb_build_object(
        'realistic', MAX(CASE WHEN cmr.element_name = 'Realistic' THEN i.data_value END),
        'investigative', MAX(CASE WHEN cmr.element_name = 'Investigative' THEN i.data_value END),
        'artistic', MAX(CASE WHEN cmr.element_name = 'Artistic' THEN i.data_value END),
        'social', MAX(CASE WHEN cmr.element_name = 'Social' THEN i.data_value END),
        'enterprising', MAX(CASE WHEN cmr.element_name = 'Enterprising' THEN i.data_value END),
        'conventional', MAX(CASE WHEN cmr.element_name = 'Conventional' THEN i.data_value END)
    ) AS riasec_profile
FROM staging.interests i
JOIN staging.content_model_reference cmr ON cmr.element_id = i.element_id
WHERE i.scale_id = 'OI'
GROUP BY i.onetsoc_code
```

**CareerGraph use:** RIASEC profiles power the Career Finder mode — users take an interest
assessment and get matched to careers with similar profiles.

---

## Table: `technology_skills`

**SQL File:** `31_technology_skills.sql`
**Maps to:** `career_nodes.metadata.technologySkills`

**Different structure** from the shared pattern (no element_id/scale_id):

| Column | Type | Description |
|--------|------|-------------|
| `onetsoc_code` | Character(10) | O*NET-SOC Code |
| `example` | Character Varying(150) | Technology skill name (e.g., "Microsoft Excel", "Python") |
| `commodity_code` | Decimal(8,0) | UNSPSC classification code |
| `hot_technology` | Character(1) | "Y" = frequently in job postings across all occupations |
| `in_demand` | Character(1) | "Y" = frequently in job postings for THIS occupation |

**Extraction:**

```sql
SELECT
    ts.onetsoc_code,
    jsonb_agg(
        jsonb_build_object(
            'name', ts.example,
            'hotTechnology', (ts.hot_technology = 'Y'),
            'inDemand', (ts.in_demand = 'Y')
        )
    ) AS tech_skills
FROM staging.technology_skills ts
GROUP BY ts.onetsoc_code
```

---

## Table: `task_statements`

**SQL File:** `17_task_statements.sql`
**Maps to:** `career_nodes.metadata.tasks`

| Column | Type | Description |
|--------|------|-------------|
| `onetsoc_code` | Character(10) | O*NET-SOC Code |
| `task_id` | Decimal(8,0) | Unique task identifier |
| `task` | Character Varying(1000) | Task statement text |
| `task_type` | Character Varying(15) | "Core" or "Supplemental" |
| `incumbents_responding` | Decimal(3,0) | Percent of workers reporting this task |

**Extraction (Core tasks only, sorted by respondent frequency):**

```sql
SELECT
    ts.onetsoc_code,
    jsonb_agg(
        jsonb_build_object(
            'task', ts.task,
            'respondingPercent', ts.incumbents_responding
        ) ORDER BY ts.incumbents_responding DESC NULLS LAST
    ) AS tasks
FROM staging.task_statements ts
WHERE ts.task_type = 'Core'
GROUP BY ts.onetsoc_code
```

---

## Table: `work_styles`

**SQL File:** `22_work_styles.sql`
**Maps to:** `career_nodes.metadata.workStyles`
**Element ID prefix:** `1.C.1.*` through `1.C.7.*`

16 work style elements including: Achievement/Effort, Persistence, Initiative, Leadership,
Cooperation, Concern for Others, Social Orientation, Self-Control, Stress Tolerance,
Adaptability/Flexibility, Dependability, Attention to Detail, Integrity, Independence,
Innovation, Analytical Thinking.

Uses the standard shared pattern with `scale_id = 'IM'`.

---

## Table: `work_values`

**SQL File:** `23_work_values.sql`
**Maps to:** `career_nodes.metadata.workValues`

| Column | Type | Description |
|--------|------|-------------|
| `onetsoc_code` | Character(10) | O*NET-SOC Code |
| `element_id` | Character Varying(20) | Content Model element |
| `scale_id` | Character Varying(3) | "EX" = Extent (how much this value is satisfied) |
| `data_value` | Decimal(5,2) | Rating |

6 work values: Achievement, Working Conditions, Recognition, Relationships, Support, Independence.

---

## Target JSONB Structure

After all metadata enrichment, `career_nodes.metadata` should look like:

```json
{
  "alternateTitles": ["Teacher", "Classroom Teacher", "Foundation Phase Educator"],
  "skills": [
    {"name": "Instructing", "importance": 4.75},
    {"name": "Speaking", "importance": 4.50},
    {"name": "Active Listening", "importance": 4.38}
  ],
  "knowledge": [
    {"name": "Education and Training", "importance": 4.88},
    {"name": "English Language", "importance": 4.50},
    {"name": "Psychology", "importance": 3.75}
  ],
  "interests": {
    "realistic": 1.33,
    "investigative": 2.00,
    "artistic": 4.33,
    "social": 6.67,
    "enterprising": 3.00,
    "conventional": 3.33
  },
  "technologySkills": [
    {"name": "Microsoft PowerPoint", "hotTechnology": true, "inDemand": true},
    {"name": "Google Classroom", "hotTechnology": false, "inDemand": true}
  ],
  "tasks": [
    {"task": "Establish and enforce rules for behavior and procedures for maintaining order among students.", "respondingPercent": 96},
    {"task": "Adapt teaching methods and instructional materials to meet varying needs and interests.", "respondingPercent": 92}
  ],
  "workStyles": [
    {"name": "Integrity", "importance": 4.62},
    {"name": "Dependability", "importance": 4.50}
  ],
  "workValues": [
    {"name": "Relationships", "extent": 4.33},
    {"name": "Achievement", "extent": 3.83}
  ]
}
```

---

## Complete Metadata Transformation SQL

This is the full metadata enrichment block that goes AFTER the core V3 steps.
Add this to `V3__transform_onet_to_careergraph.sql` after Step 7 (alternate titles).

```sql
-- === STEP 8: Enrich metadata — Top Skills (importance >= 3.0) ===
UPDATE public.career_nodes cn
SET metadata = jsonb_set(
    cn.metadata,
    '{skills}',
    COALESCE(subq.skills_json, '[]'::jsonb)
)
FROM (
    SELECT
        s.onetsoc_code,
        jsonb_agg(
            jsonb_build_object('name', cmr.element_name, 'importance', s.data_value)
            ORDER BY s.data_value DESC
        ) AS skills_json
    FROM staging.skills s
    JOIN staging.content_model_reference cmr ON cmr.element_id = s.element_id
    WHERE s.scale_id = 'IM'
      AND COALESCE(s.not_relevant, 'N') <> 'Y'
      AND COALESCE(s.recommend_suppress, 'N') <> 'Y'
      AND s.data_value >= 3.0
    GROUP BY s.onetsoc_code
) subq
WHERE cn.soc_code = subq.onetsoc_code;

-- === STEP 9: Enrich metadata — Top Knowledge areas ===
UPDATE public.career_nodes cn
SET metadata = jsonb_set(
    cn.metadata,
    '{knowledge}',
    COALESCE(subq.knowledge_json, '[]'::jsonb)
)
FROM (
    SELECT
        k.onetsoc_code,
        jsonb_agg(
            jsonb_build_object('name', cmr.element_name, 'importance', k.data_value)
            ORDER BY k.data_value DESC
        ) AS knowledge_json
    FROM staging.knowledge k
    JOIN staging.content_model_reference cmr ON cmr.element_id = k.element_id
    WHERE k.scale_id = 'IM'
      AND COALESCE(k.not_relevant, 'N') <> 'Y'
      AND COALESCE(k.recommend_suppress, 'N') <> 'Y'
      AND k.data_value >= 3.0
    GROUP BY k.onetsoc_code
) subq
WHERE cn.soc_code = subq.onetsoc_code;

-- === STEP 10: Enrich metadata — RIASEC Interest Profile ===
UPDATE public.career_nodes cn
SET metadata = jsonb_set(
    cn.metadata,
    '{interests}',
    subq.riasec_json
)
FROM (
    SELECT
        i.onetsoc_code,
        jsonb_build_object(
            'realistic', MAX(CASE WHEN cmr.element_name = 'Realistic' THEN i.data_value END),
            'investigative', MAX(CASE WHEN cmr.element_name = 'Investigative' THEN i.data_value END),
            'artistic', MAX(CASE WHEN cmr.element_name = 'Artistic' THEN i.data_value END),
            'social', MAX(CASE WHEN cmr.element_name = 'Social' THEN i.data_value END),
            'enterprising', MAX(CASE WHEN cmr.element_name = 'Enterprising' THEN i.data_value END),
            'conventional', MAX(CASE WHEN cmr.element_name = 'Conventional' THEN i.data_value END)
        ) AS riasec_json
    FROM staging.interests i
    JOIN staging.content_model_reference cmr ON cmr.element_id = i.element_id
    WHERE i.scale_id = 'OI'
    GROUP BY i.onetsoc_code
) subq
WHERE cn.soc_code = subq.onetsoc_code;

-- === STEP 11: Enrich metadata — Technology Skills ===
UPDATE public.career_nodes cn
SET metadata = jsonb_set(
    cn.metadata,
    '{technologySkills}',
    COALESCE(subq.tech_json, '[]'::jsonb)
)
FROM (
    SELECT
        ts.onetsoc_code,
        jsonb_agg(
            jsonb_build_object(
                'name', ts.example,
                'hotTechnology', (ts.hot_technology = 'Y'),
                'inDemand', (ts.in_demand = 'Y')
            )
        ) AS tech_json
    FROM staging.technology_skills ts
    GROUP BY ts.onetsoc_code
) subq
WHERE cn.soc_code = subq.onetsoc_code;

-- === STEP 12: Enrich metadata — Core Task Statements ===
UPDATE public.career_nodes cn
SET metadata = jsonb_set(
    cn.metadata,
    '{tasks}',
    COALESCE(subq.tasks_json, '[]'::jsonb)
)
FROM (
    SELECT
        ts.onetsoc_code,
        jsonb_agg(
            jsonb_build_object(
                'task', ts.task,
                'respondingPercent', ts.incumbents_responding
            ) ORDER BY ts.incumbents_responding DESC NULLS LAST
        ) AS tasks_json
    FROM staging.task_statements ts
    WHERE ts.task_type = 'Core'
    GROUP BY ts.onetsoc_code
) subq
WHERE cn.soc_code = subq.onetsoc_code;

-- === STEP 13: Enrich metadata — Work Styles ===
UPDATE public.career_nodes cn
SET metadata = jsonb_set(
    cn.metadata,
    '{workStyles}',
    COALESCE(subq.ws_json, '[]'::jsonb)
)
FROM (
    SELECT
        ws.onetsoc_code,
        jsonb_agg(
            jsonb_build_object('name', cmr.element_name, 'importance', ws.data_value)
            ORDER BY ws.data_value DESC
        ) AS ws_json
    FROM staging.work_styles ws
    JOIN staging.content_model_reference cmr ON cmr.element_id = ws.element_id
    WHERE ws.scale_id = 'IM'
      AND ws.data_value >= 3.0
    GROUP BY ws.onetsoc_code
) subq
WHERE cn.soc_code = subq.onetsoc_code;

-- === STEP 14: Enrich metadata — Work Values ===
UPDATE public.career_nodes cn
SET metadata = jsonb_set(
    cn.metadata,
    '{workValues}',
    COALESCE(subq.wv_json, '[]'::jsonb)
)
FROM (
    SELECT
        wv.onetsoc_code,
        jsonb_agg(
            jsonb_build_object('name', cmr.element_name, 'extent', wv.data_value)
            ORDER BY wv.data_value DESC
        ) AS wv_json
    FROM staging.work_values wv
    JOIN staging.content_model_reference cmr ON cmr.element_id = wv.element_id
    WHERE wv.scale_id = 'EX'
    GROUP BY wv.onetsoc_code
) subq
WHERE cn.soc_code = subq.onetsoc_code;
```

---

## Verification Queries (add to V4__verify_seed.sql)

```sql
-- Metadata completeness check
SELECT
    COUNT(*) AS total_nodes,
    COUNT(*) FILTER (WHERE metadata ? 'skills') AS with_skills,
    COUNT(*) FILTER (WHERE metadata ? 'knowledge') AS with_knowledge,
    COUNT(*) FILTER (WHERE metadata ? 'interests') AS with_interests,
    COUNT(*) FILTER (WHERE metadata ? 'technologySkills') AS with_tech_skills,
    COUNT(*) FILTER (WHERE metadata ? 'tasks') AS with_tasks,
    COUNT(*) FILTER (WHERE metadata ? 'workStyles') AS with_work_styles,
    COUNT(*) FILTER (WHERE metadata ? 'workValues') AS with_work_values,
    COUNT(*) FILTER (WHERE metadata ? 'alternateTitles') AS with_alt_titles
FROM career_nodes;

-- Spot check: Elementary School Teacher metadata richness
SELECT
    title,
    jsonb_array_length(metadata->'skills') AS skill_count,
    jsonb_array_length(metadata->'knowledge') AS knowledge_count,
    jsonb_array_length(metadata->'technologySkills') AS tech_count,
    jsonb_array_length(metadata->'tasks') AS task_count,
    metadata->'interests' AS riasec_profile
FROM career_nodes
WHERE soc_code LIKE '25-2021%';
```
