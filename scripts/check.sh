#!/usr/bin/env bash
# Verifies that the local infrastructure is ready.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${S3_BUCKET:=tlp4-uploads}" "${SQS_QUEUE_NAME:=tlp4-events}"
: "${SSM_GREETING_PARAM:=/tlp4/app/greeting}" "${SECRET_NAME:=tlp4/app/credentials}"

aws() { "$ROOT/scripts/aws.sh" "$@"; }
fail=0
check() {
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "  OK     $label"; else echo "  FALLA  $label"; fail=1; fi
}

echo "Verificando la infraestructura..."
check "Floci responde en ${AWS_ENDPOINT_URL:-http://localhost:4566}" aws s3 ls
check "Bucket de S3 $S3_BUCKET" aws s3api head-bucket --bucket "$S3_BUCKET"
check "Cola de SQS $SQS_QUEUE_NAME" aws sqs get-queue-url --queue-name "$SQS_QUEUE_NAME"
check "Parámetro de SSM $SSM_GREETING_PARAM" aws ssm get-parameter --name "$SSM_GREETING_PARAM"
check "Secreto $SECRET_NAME" aws secretsmanager get-secret-value --secret-id "$SECRET_NAME"
check "PostgreSQL acepta conexiones" docker exec tlp4-postgres pg_isready -U tlp4
check "MongoDB acepta conexiones" docker exec tlp4-mongo mongosh --quiet --eval "db.runCommand({ping:1})"

[ "$fail" -eq 0 ] && echo "Todo en orden." || { echo "Algunas verificaciones fallaron. Consulta docs/01-setup.md"; exit 1; }
