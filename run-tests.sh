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

export TEST_USER_EMAIL
TEST_USER_EMAIL="$(parse_yaml_value test_user_email)"

export TEST_USER_PASSWORD
TEST_USER_PASSWORD="$(parse_yaml_value test_user_password)"

export TEST_MANAGER_EMAIL
TEST_MANAGER_EMAIL="$(parse_yaml_value test_manager_email)"

export TEST_MANAGER_PASSWORD
TEST_MANAGER_PASSWORD="$(parse_yaml_value test_manager_password)"

npx playwright test "$@"
