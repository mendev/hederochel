#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/test-config.yaml"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: Config file not found: $CONFIG_FILE"
  echo "Copy test-config.yaml.example to test-config.yaml and fill in your credentials."
  exit 1
fi

parse_yaml_value() {
  local key="$1"
  local value
  value=$(grep -E "^${key}:" "$CONFIG_FILE" | sed "s/^${key}:[[:space:]]*//")
  if [[ -z "$value" ]]; then
    echo "Error: Required key '$key' not found in $CONFIG_FILE" >&2
    exit 1
  fi
  echo "$value"
}

# Read a value from .env.local (skips commented-out lines)
parse_env_value() {
  local key="$1"
  grep -E "^${key}=" "$SCRIPT_DIR/.env.local" 2>/dev/null | head -1 | sed "s/^${key}=//"
}

export TEST_USER_EMAIL
TEST_USER_EMAIL="$(parse_yaml_value test_user_email)"

export TEST_USER_PASSWORD
TEST_USER_PASSWORD="$(parse_yaml_value test_user_password)"

export TEST_MANAGER_EMAIL
TEST_MANAGER_EMAIL="$(parse_yaml_value test_manager_email)"

export TEST_MANAGER_PASSWORD
TEST_MANAGER_PASSWORD="$(parse_yaml_value test_manager_password)"

# Supabase credentials for test helpers (e.g. cleanup.ts) that talk directly
# to the DB without a user session.
export SUPABASE_URL
SUPABASE_URL="$(parse_env_value NEXT_PUBLIC_SUPABASE_URL)"

export SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SERVICE_ROLE_KEY="$(parse_env_value SUPABASE_SERVICE_ROLE_KEY)"

npx playwright test "$@"
