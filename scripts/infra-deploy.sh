#!/usr/bin/env bash
# Creates or updates the AWS stack for theguydea.com (S3 + CloudFront + ACM + Route53).
# Only run when the owner asks. See docs/deployment.md.
set -euo pipefail
cd "$(dirname "$0")/.."

STACK="guydeatory-site"
REGION="us-east-1" # CloudFront certificates must live in us-east-1
export AWS_PAGER=""

npx tsx infra/render.ts
aws cloudformation validate-template --region "$REGION" --template-body file://infra/.build/site.yml > /dev/null

echo "Deploying stack $STACK (certificate validation and CloudFront can take 5–20 minutes)…"
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK" \
  --template-file infra/.build/site.yml \
  --no-fail-on-empty-changeset \
  --capabilities CAPABILITY_NAMED_IAM \
  --tags project=guydeatory

aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' --output table
