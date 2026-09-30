# Deployment

The site is served at **https://theguydea.com**. It is a static build in S3, delivered through
CloudFront, all defined in one CloudFormation stack. **Every push to `main` deploys the site**
through GitHub Actions (see "Continuous deployment" below).

> Deploy only when the owner asks. Deploying publishes content to the world.

## AWS resources (stack `guydeatory-site`, region us-east-1)

| Resource | Notes |
|---|---|
| S3 bucket | Private: public access is blocked, SSE-S3 encryption. Only CloudFront can read it, through Origin Access Control. |
| ACM certificate | `theguydea.com` + `www.theguydea.com`, DNS-validated in hosted zone `Z06939482PPSH3VUZ9L07`. Must be in us-east-1 for CloudFront. |
| CloudFront distribution | Aliases for the apex and `www`. HTTP/2 + HTTP/3, compression, price class 100. Managed CachingOptimized cache policy and SecurityHeaders response policy. 403/404 → `/404.html` with status 404. |
| CloudFront Function `guydeatory-router` | Viewer request, runtime `cloudfront-js-2.0`. Source in `infra/cloudfront/router.js`, tested in `tests/router.test.ts`. |
| Route53 records | A and AAAA aliases for the apex and `www` → the distribution |
| GitHub OIDC provider | `token.actions.githubusercontent.com`. Lets GitHub Actions log in with a short-lived token instead of stored keys. Account-wide (one per account): another stack that needs it must reference this one. |
| IAM role `guydeatory-github-deploy` | Only pushes to `main` in this repository can assume it: the token subject must be `repo:GuyDea@160761272/guydeatory@1393818515:ref:refs/heads/main` (GitHub adds the owner and repository ids, which survive renames). It can read this stack's outputs, write and delete objects in the site bucket, and create and read invalidations on the distribution. Nothing else. |

The domain `theguydea.com` is registered in Route53 in the same AWS account. The hosted zone is
`Z06939482PPSH3VUZ9L07`.

### Live stack outputs (created 2026-09-29)

| Output | Value |
|---|---|
| BucketName | `guydeatory-site-sitebucket-luacmlkiatbc` |
| DistributionId | `E1E9R6G6JD5REX` |
| DistributionDomainName | `d3jfmpxjaq9phs.cloudfront.net` |
| DeployRoleArn | `arn:aws:iam::902325674644:role/guydeatory-github-deploy` |

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

Run locally, both use the `default` AWS CLI profile (`~/.aws/credentials`). GitHub Actions runs
`npm run deploy` with the deploy role instead. `npm run infra:deploy` is always run by hand: the
deploy role cannot change the stack.

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

## Continuous deployment

`.github/workflows/deploy.yml` runs on every push to `main`, and by hand from the Actions tab
("Run workflow"):

1. It installs dependencies (`npm ci`) with the Node version from `.nvmrc`.
2. It asks GitHub for an OIDC token and exchanges it for the `guydeatory-github-deploy` role
   (`aws-actions/configure-aws-credentials`). No AWS keys are stored in GitHub.
3. It runs `npm run deploy`, the same script as a local deploy. A failing check stops it before
   anything is uploaded.

Only one deploy runs at a time; a newer push waits for the running one. Merging to `main` is
therefore publishing: never push or merge to `main` unless the owner asks.

Changes to `infra/` (the router, the stack) are not deployed by the workflow. Run
`npm run infra:deploy` by hand.

**Which version is live?** The footer of every page says "Version 1a2b3c4" and links to that
commit on GitHub. A "+" after it means a local build with uncommitted changes.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Old content after a deploy | Check that the invalidation finished: `aws cloudfront list-invalidations --distribution-id <id>` |
| 403 for an existing page | The object key is missing. Check `dist/<path>/index.html` exists and the sync ran. |
| The certificate is stuck in "pending" | Check that the validation CNAME exists in the hosted zone (CloudFormation creates it) |
| Search does not work live | Check that `dist/pagefind/` was uploaded. `npm run build` must run Pagefind. |
| The deploy workflow fails at "Configure AWS credentials" ("Not authorized to perform sts:AssumeRoleWithWebIdentity") | The token's subject doesn't match the role's trust condition. CloudTrail shows the subject GitHub sent: `aws cloudtrail lookup-events --region us-east-1 --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity` (the `userName` field, a few minutes after the failure). Put it in the trust condition in `infra/site.template.yml`, then `npm run infra:deploy`. |
| The deploy workflow fails with AccessDenied | The deploy needs a permission the role lacks. Add it to the role's `publish-site` policy in `infra/site.template.yml`, keep it scoped to this bucket or distribution, then `npm run infra:deploy`. |
