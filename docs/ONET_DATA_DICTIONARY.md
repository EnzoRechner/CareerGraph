# O*NET 30.2 Data Dictionary — CareerGraph Reference

Source: https://www.onetcenter.org/dictionary/30.2/mysql/
License: Creative Commons Attribution 4.0 (CC BY 4.0)

This document covers only the O*NET tables that CareerGraph consumes.
For the full data dictionary, see the source URL above.

---

## Table: `occupation_data`

**Purpose:** Core occupation records. Each row is one career/occupation.
**SQL File:** `03_occupation_data.sql`
**Row Count:** 1,016

| Column | Type | Description |
|--------|------|-------------|
| `onetsoc_code` | Character(10) | O*NET-SOC Code (e.g., "25-2021.00") — primary identifier |
| `title` | Character Varying(150) | Occupation title (e.g., "Elementary School Teachers, Except Special Education") |
| `description` | Character Varying(1000) | Occupation description/definition |

**Maps to:** `career_nodes` (soc_code, title, description)

**Notes:**
- The `onetsoc_code` is the standard SOC code with an O*NET-specific suffix (e.g., ".00", ".01").
- The 2-digit prefix of the SOC code identifies the major occupation group (used for career cluster mapping).

---

## Table: `related_occupations`

**Purpose:** Directed relationships between occupations. This is the graph edge data.
**SQL File:** `27_related_occupations.sql`
**Row Count:** 18,460

| Column | Type | Description |
|--------|------|-------------|
| `onetsoc_code` | Character(10) | Source O*NET-SOC Code (FK → occupation_data) |
| `related_onetsoc_code` | Character(10) | Target O*NET-SOC Code (FK → occupation_data) |
| `relatedness_tier` | Character Varying(50) | Tier of relatedness (see below) |
| `related_index` | Decimal(3,0) | Order within tier (1 = most related) |

**Maps to:** `career_edges` (source_node_id, target_node_id)

**Relatedness Tiers:**
- `Primary-Short` — Top 5 most strongly related occupations (after expert review)
- `Primary-Long` — 6th to 10th most strongly related occupations
- `Supplemental` — 11th to 20th most strongly related occupations

**Notes:**
- Each occupation has exactly 20 related occupations (10 primary + 10 supplemental).
- Relatedness is based on: what people do, what they know, and what they are called.
- For CareerGraph MVP, consider importing only `Primary-Short` and `Primary-Long` to keep the graph manageable. `Supplemental` can be added later.
- The `related_index` can be used to derive edge weight (lower index = stronger relationship).

---

## Table: `job_zones`

**Purpose:** Maps occupations to preparation level zones (1-5).
**SQL File:** `14_job_zones.sql`

| Column | Type | Description |
|--------|------|-------------|
| `onetsoc_code` | Character(10) | O*NET-SOC Code (FK → occupation_data) |
| `job_zone` | Decimal(2,0) | Job Zone number (1-5) |

**Maps to:** `career_nodes.experience_years_typical` (via zone-to-years conversion)

**Job Zone Definitions (from O*NET Job Zone Reference):**
- **Zone 1:** Little or No Preparation Needed (≈ 0 years)
- **Zone 2:** Some Preparation Needed (≈ 1 year)
- **Zone 3:** Medium Preparation Needed (≈ 3 years)
- **Zone 4:** Considerable Preparation Needed (≈ 5 years)
- **Zone 5:** Extensive Preparation Needed (≈ 8+ years)

**Notes:**
- NOTE: As of O*NET 30.2, the Job Zone system has been updated. There may be a transition 
  to a four-level framework. Claude Code should inspect the actual data after staging import
  to verify which zones are present (e.g., run `SELECT DISTINCT job_zone FROM staging.job_zones ORDER BY 1;`).

---

## Table: `education_training_experience`

**Purpose:** Percent frequency data for education, training, and experience requirements.
**SQL File:** `12_education_training_experience.sql`
**Row Count:** 37,125

| Column | Type | Description |
|--------|------|-------------|
| `onetsoc_code` | Character(10) | O*NET-SOC Code (FK → occupation_data) |
| `element_id` | Character Varying(20) | Content Model element (e.g., "2.D.1" = Required Level of Education) |
| `scale_id` | Character Varying(3) | Scale identifier (e.g., "RL" = Required Level of Education) |
| `category` | Decimal(3,0) | Category number within the scale |
| `data_value` | Decimal(5,2) | Percent frequency (0.00 to 100.00) |
| `n` | Decimal(4,0) | Sample size |
| `standard_error` | Decimal(7,4) | Standard error (may be NULL) |
| `lower_ci_bound` | Decimal(7,4) | Lower 95% CI (may be NULL) |
| `upper_ci_bound` | Decimal(7,4) | Upper 95% CI (may be NULL) |
| `recommend_suppress` | Character(1) | "Y" if low precision, "N" if OK |
| `date_updated` | Date | When data was last updated |
| `domain_source` | Character Varying(30) | "Occupational Expert" or "Worker" |

**Maps to:** `career_nodes.education_level`

**CRITICAL — How to extract education level:**

The table has MULTIPLE element_id/scale_id combinations. For education level:
- Filter: `element_id = '2.D.1'` AND `scale_id = 'RL'`
- Each SOC code has multiple rows (one per category = one per education level)
- `data_value` = percent of respondents who said this education level is required
- Pick the `category` with the HIGHEST `data_value` = most commonly required education

The `category` number maps to human-readable labels via `ete_categories` table.

---

## Table: `ete_categories`

**Purpose:** Lookup table for education/training/experience category descriptions.
**SQL File:** `05_ete_categories.sql`
**Row Count:** 41

| Column | Type | Description |
|--------|------|-------------|
| `element_id` | Character Varying(20) | Content Model element |
| `scale_id` | Character Varying(3) | Scale identifier |
| `category` | Decimal(3,0) | Category number |
| `category_description` | Character Varying(1000) | Human-readable description |

**Required Level of Education categories (element_id='2.D.1', scale_id='RL'):**

| Category | Description |
|----------|-------------|
| 1 | Less than a High School Diploma |
| 2 | High School Diploma - or the equivalent (for example, GED) |
| 3 | Post-Secondary Certificate - awarded for training completed after high school |
| 4 | Some College Courses |
| 5 | Associate's Degree (or other 2-year degree) |
| 6 | Bachelor's Degree |
| 7 | Post-Baccalaureate Certificate |
| 8 | Master's Degree |
| 9 | Post-Master's Certificate |
| 10 | First Professional Degree (for example, dentistry, medicine, optometry) |
| 11 | Doctoral Degree |
| 12 | Post-Doctoral Training |

**Related Work Experience categories (element_id='3.A.1', scale_id='RW'):**

| Category | Description |
|----------|-------------|
| 1 | None |
| 2 | Up to and including 1 month |
| 3 | Over 1 month, up to and including 3 months |
| 4 | Over 3 months, up to and including 6 months |
| 5 | Over 6 months, up to and including 1 year |
| 6 | Over 1 year, up to and including 2 years |
| 7 | Over 2 years, up to and including 4 years |
| 8 | Over 4 years, up to and including 6 years |
| 9 | Over 6 years, up to and including 8 years |
| 10 | Over 8 years, up to and including 10 years |
| 11 | Over 10 years |

---

## Table: `alternate_titles`

**Purpose:** Alternative job titles for each occupation (for search enhancement).
**SQL File:** `04_alternate_titles.sql`

| Column | Type | Description |
|--------|------|-------------|
| `onetsoc_code` | Character(10) | O*NET-SOC Code (FK → occupation_data) |
| `alternate_title` | Character Varying(150) | Alternative title for the occupation |
| `short_title` | Character Varying(50) | Abbreviated title (may be NULL) |
| `sources` | Character Varying(10) | Source codes for the alternate title |

**Maps to:** `career_nodes.metadata.alternateTitles` (JSONB array)

**Notes:**
- Multiple rows per SOC code (one per alternate title).
- Useful for search: "Foundation Phase Teacher" won't match the SOC title directly,
  but might match an alternate title.

---

## Corrected Transformation SQL

The V3 transformation script in CLAUDE.md needs these corrections based on actual column names:

### Education Level Query (CORRECTED)

```sql
-- WRONG (from original CLAUDE.md):
-- WHERE element_name = 'Required Level of Education'

-- CORRECT (actual column names):
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
    WHERE ete.element_id = '2.D.1'     -- Required Level of Education element
      AND ete.scale_id = 'RL'          -- Required Level scale
    ORDER BY ete.onetsoc_code, ete.data_value DESC  -- Highest % = most common requirement
) subq
WHERE cn.soc_code = subq.onetsoc_code;
```

### Related Occupations Edge Weight Enhancement

The `relatedness_tier` and `related_index` columns can improve edge weight calculation:

```sql
-- Use relatedness tier and index for more nuanced weights
UPDATE public.career_edges ce
SET weight = CASE
    WHEN ro.relatedness_tier = 'Primary-Short' THEN 1.0 + (ro.related_index * 0.1)
    WHEN ro.relatedness_tier = 'Primary-Long'  THEN 1.5 + (ro.related_index * 0.1)
    WHEN ro.relatedness_tier = 'Supplemental'  THEN 2.5 + (ro.related_index * 0.1)
    ELSE 3.0
END
FROM staging.related_occupations ro
JOIN public.career_nodes src ON src.soc_code = ro.onetsoc_code
JOIN public.career_nodes tgt ON tgt.soc_code = ro.related_onetsoc_code
WHERE ce.source_node_id = src.id
  AND ce.target_node_id = tgt.id;
```

---

## Full Table of Contents (All 40 O*NET Tables)

For reference, the complete list of tables in the O*NET 30.2 database:

**Knowledge, Skills, Abilities:** knowledge, skills, abilities
**Education:** education_training_experience, ete_categories, job_zones, job_zone_reference
**Interests:** interests, riasec_keywords, basic_interests_to_riasec, interests_illustrative_activities, interests_illustrative_occupations
**Work Styles:** work_styles, work_values
**Tasks:** task_statements, task_ratings, task_categories, emerging_tasks
**Technology Skills:** technology_skills, unspsc_reference, tools_used
**Work Activities:** work_activities, iwa_reference, dwa_reference, tasks_to_dwas
**Work Context:** work_context, work_context_categories
**Occupation Titles:** occupation_data, alternate_titles, sample_of_reported_titles
**Related Occupations:** related_occupations, abilities_to_work_activities, abilities_to_work_context, skills_to_work_activities, skills_to_work_context
**Data Collection:** content_model_reference, occupation_level_metadata, level_scale_anchors, scales_reference, survey_booklet_locations

CareerGraph MVP uses 5 of these tables. The rest contain rich metadata (skills, interests, work context, tasks) that can enrich the graph in future phases.
