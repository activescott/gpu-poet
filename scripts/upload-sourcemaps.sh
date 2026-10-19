#!/bin/sh
# Inject chunk IDs into built JS and upload its source maps to PostHog error
# tracking, then delete all .map files so they are not served publicly.
# Usage: upload-sourcemaps.sh <dir>
# Credentials come from BuildKit secrets (/run/secrets/*) or the environment.
set -eu

dir="${1:?usage: upload-sourcemaps.sh <dir>}"

read_secret() {
  if [ -n "$(printenv "$1" || true)" ]; then printenv "$1"
  elif [ -r "/run/secrets/$1" ]; then cat "/run/secrets/$1"
  fi
}

api_key="$(read_secret POSTHOG_PERSONAL_API_KEY || true)"
env_id="$(read_secret POSTHOG_ENV_ID || true)"

if [ -n "$api_key" ] && [ -n "$env_id" ]; then
  echo "upload-sourcemaps: uploading source maps from $dir to PostHog"
  export POSTHOG_CLI_API_KEY="$api_key"
  export POSTHOG_CLI_ENV_ID="$env_id"
  export POSTHOG_CLI_HOST="${POSTHOG_CLI_HOST:-https://us.posthog.com}"
  npx --yes @posthog/cli@latest sourcemap process --directory "$dir"
else
  echo "upload-sourcemaps: POSTHOG_PERSONAL_API_KEY / POSTHOG_ENV_ID not set; skipping upload"
fi

find "$dir" -name '*.map' -type f -delete
echo "upload-sourcemaps: deleted .map files from $dir"
