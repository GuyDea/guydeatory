# Deployment

The site is served at **https://theguydea.com**. It is a static build in S3, delivered through
CloudFront, all defined in one CloudFormation stack.

> Deploy only when the owner asks. Deploying publishes content to the world.

## AWS resources (stack `guydeatory-site`, region us-east-1)

| Resource | Notes |
|---|---|
| S3 bucket | Private: public access is blocked, SSE-S3 encryption. Only CloudFront can read it, through Origin Access Control. |
| ACM certificate | `theguydea.com` + `www.theguydea.com`, DNS-validated in hosted zone `Z06939482PPSH3VUZ9L07`. Must be in us-east-1 for CloudFront. |
| CloudFront distribution | Aliases for the apex and `www`. HTTP/2 + HTTP/3, compression, price class 100. Managed CachingOptimized cache policy and SecurityHeaders response policy. 403/404 → `/404.html` with status 404. |
| CloudFront Function `guydeatory-router` | Viewer request, runtime `cloudfront-js-2.0`. Source in `infra/cloudfront/router.js`, tested in `tests/router.test.ts`. |
| Route53 records | A and AAAA aliases for the apex and `www` → the distribution |

The domain `theguydea.com` is registered in Route53 in the same AWS account. The hosted zone is
`Z06939482PPSH3VUZ9L07`.

### Live stack outputs (created 2026-09-29)

| Output | Value |
|---|---|
| BucketName | `guydeatory-site-sitebucket-luacmlkiatbc` |
| DistributionId | `E1E9R6G6JD5REX` |
| DistributionDomainName | `d3jfmpxjaq9phs.cloudfront.net` |

The deploy script reads these from the stack itself, so this table is only for reference. The
bucket has `DeletionPolicy: Retain`, so deleting the stack keeps the files.

### Router behaviour

| Request | Result |
|---|---|
| `www.theguydea.com/…` | 301 → `https://theguydea.com/…` |
| `/` | 302 → `/sk/` or `/en/`. Order: `lang` cookie, then `Accept-Language` (Czech → Slovak), else English. |
| `/en/voltage/` | Rewritten to `/en/voltage/index.html` (S3 has no directory index) |
| `/en/voltage` | 301 → `https://theguydea.com/en/voltage/` |
| `//example.com/x`, `/\example.com/x` | 301 → `https://theguydea.com/example.com/x`. A path that looks like another host never leaves the site. |
| Files (`/_astro/x.css`, `/sitemap.xml`) | Unchanged |

Every redirect goes to an absolute `https://theguydea.com/…` URL and keeps the query string exactly
as it arrived. CloudFront hands it over already percent-encoded, so encoding it again would turn
`?q=pr%C3%BAd` into `?q=pr%25C3%25BAd`.

## Commands

```bash
npm run infra:deploy   # create/update the CloudFormation stack (renders infra/.build/site.yml first)
npm run deploy         # check → build → upload to S3 → invalidate CloudFront
```

Both use the `default` AWS CLI profile (`~/.aws/credentials`).

### What `npm run deploy` does

1. `npm run check`: types, tests, content lint, build, dist checks. It stops on any failure.
2. It reads the bucket name and distribution id from the stack outputs.
3. It uploads the hashed assets (`_astro/**`) with `Cache-Control: public, max-age=31536000,
   immutable`, without deleting old ones yet. Pages still cached somewhere may reference them.
4. It uploads everything else (HTML, Pagefind files, sitemap…) with `--delete` and
   `Cache-Control: public, max-age=0, s-maxage=31536000, must-revalidate`. Browsers always
   revalidate; CloudFront keeps a copy until the next invalidation.
5. It runs `aws cloudfront create-invalidation --paths '/*'` and waits until the invalidation is done.
6. Only then does it remove old `_astro/**` files (`scripts/prune-assets.ts`): those the current
   build no longer has and that were last uploaded more than 7 days ago. A reader who opened a page
   before the deploy can still load its widgets for a week. Every deploy uploads the current assets
   again (step 3), so an asset's upload date is the last deploy that used it. The script lists the
   bucket with `s3api list-objects-v2`, page by page, and deletes with `s3api delete-objects`, up to
   1,000 keys per request, so it needs only `s3:ListBucket` and `s3:DeleteObject`. Add `--dry-run`
   to see what it would delete.

## Testing the router in the real CloudFront runtime

```bash
ETAG=$(aws cloudfront describe-function --name guydeatory-router --stage LIVE --query ETag --output text)
aws cloudfront test-function --name guydeatory-router --if-match "$ETAG" --stage LIVE --event-object fileb://event.json
```

`event.json` holds a viewer-request event: `{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"1.2.3.4"},"request":{"method":"GET","uri":"/","querystring":{},"headers":{"host":{"value":"theguydea.com"}},"cookies":{}}}`.

## First-time setup (already done once)

1. `npm run infra:deploy`. Certificate validation and distribution creation take about 5–20
   minutes.
2. `npm run deploy`.
3. Verify:
   ```bash
   curl -sI https://theguydea.com/ | grep -iE '^(HTTP|location)'
   curl -sI https://www.theguydea.com/en/ | grep -iE '^(HTTP|location)'
   curl -sI https://theguydea.com/en/electric-current/ | grep -iE '^(HTTP|strict-transport)'
   curl -sI https://theguydea.com/does-not-exist/ | head -1
   ```

## Continuous integration

`.github/workflows/check.yml` runs `npm run check` on GitHub for every push to a branch other than
`main`. It needs no secrets and no AWS access. Results: the repository's Actions tab.

## Next step (not set up yet)

Continuous deployment from GitHub Actions on merges to `main`, using an AWS IAM role assumed
through GitHub OIDC (no stored keys). This needs the owner's go-ahead, because it creates an IAM
role.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Old content after a deploy | Check that the invalidation finished: `aws cloudfront list-invalidations --distribution-id <id>` |
| 403 for an existing page | The object key is missing. Check `dist/<path>/index.html` exists and the sync ran. |
| The certificate is stuck in "pending" | Check that the validation CNAME exists in the hosted zone (CloudFormation creates it) |
| Search does not work live | Check that `dist/pagefind/` was uploaded. `npm run build` must run Pagefind. |
