#!/usr/bin/env bash
# Builds, checks and publishes the site to theguydea.com. Only run when the owner asks.
# See docs/deployment.md for what each step does.
set -euo pipefail
cd "$(dirname "$0")/.."

STACK="guydeatory-site"
REGION="us-east-1"
export AWS_PAGER=""

output() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

echo "▶ Checking and building…"
npm run check

BUCKET="$(output BucketName)"
DISTRIBUTION="$(output DistributionId)"
echo "▶ Uploading to s3://$BUCKET (distribution $DISTRIBUTION)…"

# 1. Hashed assets first (never change once published): cache for a year.
aws s3 sync dist/_astro "s3://$BUCKET/_astro" \
  --cache-control "public, max-age=31536000, immutable" --only-show-errors

# 2. Everything else: browsers always revalidate; CloudFront keeps it until the invalidation below.
aws s3 sync dist "s3://$BUCKET" --delete --exclude "_astro/*" \
  --cache-control "public, max-age=0, s-maxage=31536000, must-revalidate" --only-show-errors

# 3. Tell CloudFront to fetch the new versions, and wait until it has.
INVALIDATION="$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths '/*' \
  --query 'Invalidation.Id' --output text)"
echo "▶ Waiting for invalidation $INVALIDATION…"
aws cloudfront wait invalidation-completed --distribution-id "$DISTRIBUTION" --id "$INVALIDATION"

# 4. Only now remove assets that no current page uses, and only once they are more than 7 days old:
#    a page opened before this deploy may still load its widgets' old chunks.
npx tsx scripts/prune-assets.ts "$BUCKET"

echo "✓ Deployed: https://theguydea.com/"
