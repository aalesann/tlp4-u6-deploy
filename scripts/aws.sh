#!/usr/bin/env bash
# Runs the AWS CLI against Floci without installing anything but Docker.
# Usage: ./scripts/aws.sh s3 ls
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

exec docker run --rm -i --network host \
  -v "$ROOT:/work" -w /work \
  -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}" \
  -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}" \
  -e AWS_DEFAULT_REGION="${AWS_REGION:-us-east-1}" \
  amazon/aws-cli \
  --endpoint-url "${AWS_ENDPOINT_URL:-http://localhost:4566}" "$@"
