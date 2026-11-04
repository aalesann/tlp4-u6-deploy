#!/usr/bin/env bash
# Creates the AWS resources the app needs inside Floci. Safe to run twice.
# Names can be overridden with environment variables (see backend/src/config.js).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${S3_BUCKET:=tlp4-uploads}" "${SQS_QUEUE_NAME:=tlp4-events}"
: "${SSM_GREETING_PARAM:=/tlp4/app/greeting}" "${SECRET_NAME:=tlp4/app/credentials}"

aws() { "$ROOT/scripts/aws.sh" "$@"; }

echo "==> Bucket de S3: $S3_BUCKET"
aws s3api head-bucket --bucket "$S3_BUCKET" >/dev/null 2>&1 || aws s3 mb "s3://$S3_BUCKET"

echo "==> Cola de SQS: $SQS_QUEUE_NAME"
aws sqs create-queue --queue-name "$SQS_QUEUE_NAME" >/dev/null

echo "==> Parámetro de SSM: $SSM_GREETING_PARAM"
aws ssm put-parameter --name "$SSM_GREETING_PARAM" \
  --value "Hola desde Parameter Store" --type String --overwrite >/dev/null

echo "==> Secreto de Secrets Manager: $SECRET_NAME"
SECRET_JSON='{"apiKey":"super-secret-key","apiUser":"student"}'
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" >/dev/null 2>&1; then
  aws secretsmanager put-secret-value --secret-id "$SECRET_NAME" --secret-string "$SECRET_JSON" >/dev/null
else
  aws secretsmanager create-secret --name "$SECRET_NAME" --secret-string "$SECRET_JSON" >/dev/null
fi

echo "Listo. Ejecuta ./scripts/check.sh para verificar."
