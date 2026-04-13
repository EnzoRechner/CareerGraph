# data/seed/V2__import_onet_staging.sh
#!/usr/bin/env bash
# This script loads O*NET PostgreSQL dumps into a staging schema.
# Usage: bash data/seed/V2__import_onet_staging.sh

set -euo pipefail

ONET_SQL_DIR="${PWD}/data/onet"
DB_CONTAINER="careergraph-db-1"
DB_NAME="careergraph"
DB_USER="careergraph"

echo "=== O*NET Staging Import ==="

# Ensure the staging schema is clean
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "DROP SCHEMA IF EXISTS staging CASCADE; CREATE SCHEMA staging;"

# Import each SQL file into the staging schema
for sqlfile in "$ONET_SQL_DIR"/*.sql; do
    echo "  → $(basename "$sqlfile")"
    (echo "SET search_path TO staging;" && cat "$sqlfile") | \
        docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q
    echo
    sleep 0.1

done

# Verify
printf '\n=== Staging tables ===\n'
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt staging.*"
