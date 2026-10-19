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
project_id="$(read_secret POSTHOG_PROJECT_ID || true)"

if [ -n "$api_key" ] && [ -n "$project_id" ]; then
  echo "upload-sourcemaps: uploading source maps from $dir to PostHog"
  export POSTHOG_CLI_API_KEY="$api_key"
  export POSTHOG_CLI_PROJECT_ID="$project_id"
  export POSTHOG_CLI_HOST="${POSTHOG_CLI_HOST:-https://us.posthog.com}"
  # An upload failure must never block a production deploy: warn and carry on.
  rc=0
  npx --yes @posthog/cli@0.18.10 sourcemap process --directory "$dir" || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "upload-sourcemaps: WARNING upload failed (exit code $rc); continuing without uploaded source maps"
  fi
else
  echo "upload-sourcemaps: POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID not set; skipping upload"
fi

find "$dir" -name '*.map' -type f -delete
echo "upload-sourcemaps: deleted .map files from $dir"
