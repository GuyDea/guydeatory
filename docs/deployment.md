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

### Router behaviour

| Request | Result |
|---|---|
| `www.theguydea.com/…` | 301 → `https://theguydea.com/…` |
| `/` | 302 → `/sk/` or `/en/`. Order: `lang` cookie, then `Accept-Language` (Czech → Slovak), else English. |
| `/en/voltage/` | Rewritten to `/en/voltage/index.html` (S3 has no directory index) |
| `/en/voltage` | 301 → `/en/voltage/` |
| Files (`/_astro/x.css`, `/sitemap.xml`) | Unchanged |

## Commands

```bash
npm run infra:deploy   # create/update the CloudFormation stack (renders infra/.build/site.yml first)
npm run deploy         # check → build → upload to S3 → invalidate CloudFront
```

Both use the `default` AWS CLI profile (`~/.aws/credentials`).

### What `npm run deploy` does

1. `npm run check`: types, tests, content lint, build, dist checks. It stops on any failure.
2. It reads the bucket name and distribution id from the stack outputs.
3. `aws s3 sync dist/ s3://<bucket>/ --delete` in two passes:
   - `_astro/**` (hashed file names): `Cache-Control: public, max-age=31536000, immutable`
   - everything else (HTML, Pagefind files, sitemap): `Cache-Control: public, max-age=0,
     s-maxage=31536000, must-revalidate`. Browsers always revalidate; CloudFront keeps a copy until
     the next invalidation.
4. `aws cloudfront create-invalidation --paths '/*'`, then it waits for the invalidation to finish.

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
