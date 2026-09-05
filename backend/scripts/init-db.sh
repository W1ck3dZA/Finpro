#!/usr/bin/env bash
# Creates the app database and a dedicated MySQL user for it, using values from .env.
# Connects as DB_ROOT_USER (an account that already has privileges to create databases/users,
# e.g. via unix socket auth on a local dev machine) and grants DB_APP_USER access to DB_NAME only.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "backend/.env not found. Copy .env.example to .env and fill in real values first." >&2
  exit 1
fi

set -a
source .env
set +a

: "${DB_ROOT_USER:?DB_ROOT_USER must be set in .env}"
: "${DB_ROOT_PASSWORD:?DB_ROOT_PASSWORD must be set in .env}"
: "${DB_NAME:?DB_NAME must be set in .env}"
: "${DB_APP_USER:?DB_APP_USER must be set in .env}"
: "${DB_APP_PASSWORD:?DB_APP_PASSWORD must be set in .env}"

DB_SHADOW_NAME="${DB_SHADOW_NAME:-${DB_NAME}_shadow}"

mysql -u "$DB_ROOT_USER" -p"$DB_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS \`${DB_SHADOW_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_APP_USER}'@'localhost' IDENTIFIED BY '${DB_APP_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_APP_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_SHADOW_NAME}\`.* TO '${DB_APP_USER}'@'localhost';
-- '%'-host variant: MySQL's '@localhost' account only matches unix-socket/127.0.0.1 connections,
-- so a Docker container reaching this DB via host.docker.internal needs a separate grant.
CREATE USER IF NOT EXISTS '${DB_APP_USER}'@'%' IDENTIFIED BY '${DB_APP_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_APP_USER}'@'%';
FLUSH PRIVILEGES;
SQL

echo "Database '${DB_NAME}' (+ shadow '${DB_SHADOW_NAME}') and user '${DB_APP_USER}'@'localhost'/'@%' are ready."
