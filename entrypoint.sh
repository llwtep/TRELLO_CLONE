#!/bin/bash
set -e

# ==============================================================================
# Backend Entrypoint Script
# ==============================================================================

echo "=== Starting Backend Service ==="

# Configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
MAX_RETRIES=30
RETRY_INTERVAL=2

# ------------------------------------------------------------------------------
# Wait for PostgreSQL to be ready
# ------------------------------------------------------------------------------
wait_for_postgres() {
    echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
    
    retries=0
    until python -c "
import socket
import sys
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = sock.connect_ex(('${DB_HOST}', ${DB_PORT}))
sock.close()
sys.exit(result)
" 2>/dev/null; do
        retries=$((retries + 1))
        if [ $retries -ge $MAX_RETRIES ]; then
            echo "ERROR: PostgreSQL is not available after ${MAX_RETRIES} attempts"
            exit 1
        fi
        echo "PostgreSQL not ready. Attempt ${retries}/${MAX_RETRIES}. Retrying in ${RETRY_INTERVAL}s..."
        sleep $RETRY_INTERVAL
    done
    
    echo "PostgreSQL is ready!"
}

# ------------------------------------------------------------------------------
# Run Alembic migrations with retry logic
# ------------------------------------------------------------------------------
run_migrations() {
    echo "Running Alembic migrations..."
    
    retries=0
    max_migration_retries=5
    
    until alembic upgrade head; do
        retries=$((retries + 1))
        if [ $retries -ge $max_migration_retries ]; then
            echo "ERROR: Migration failed after ${max_migration_retries} attempts"
            exit 1
        fi
        echo "Migration failed. Attempt ${retries}/${max_migration_retries}. Retrying in ${RETRY_INTERVAL}s..."
        sleep $RETRY_INTERVAL
    done
    
    echo "Migrations completed successfully!"
}

# ------------------------------------------------------------------------------
# Main execution
# ------------------------------------------------------------------------------
wait_for_postgres
run_migrations

echo "Starting Uvicorn server..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers "${UVICORN_WORKERS:-1}" \
    --loop uvloop \
    --http httptools \
    --no-access-log
