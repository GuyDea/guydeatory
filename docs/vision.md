# Vision

## In the owner's words (2026-09-28)

> We're going to build a platform that will gather explanations about how things work. If I want
> to have some question answered, there will be a dedicated article with the explanation, starting
> from the absolute fundamentals. Articles will be grouped and searchable based on the names and
> potentially article content. Everything will be translatable — we will use English and Slovak as
> default, but later on we can add other languages. This is the idea of the Guydeatory. It will be
> a static website.
>
> Every article must be as simple to read as possible, with interactive showcases and diagrams
> wherever it helps to explain the phenomena. In every article, if there is some term used, it is
> highlighted, and after clicking it we navigate in breadcrumbs to its dedicated webpage explaining
> it. So every time there is something more complex that doesn't 100% help with the core topic
> explanation, we dedicate a separate article to it. Articles can also be sorted by the type of
> explanation they provide (high level, low level, trivia, historical…), and the whole article
> tree can be filtered by these labels.
>
> In this application we will explain any question that can pop up — anything in the world — so
> it must stay organized, scalable and easily searchable, even with thousands of articles.
>
> The goal is that children must also be able to understand the concepts, as this is meant for my
> kids as well.

## Decisions taken with the owner

| Topic | Decision |
|---|---|
| Audience | Kids of about **8–10 reading alone**, plus adults. |
| Layering | **One layered text:** kid-level main text, and grown-up depth in "Go deeper" blocks. No separate kids' version. |
| Languages | English + Slovak required from day one. More languages later, rolled out gradually through the fallback in `docs/translation.md`. |
| Stack | Astro + MDX + Svelte islands + Pagefind. Fully static. |
| Hosting | `theguydea.com` on AWS (S3 + CloudFront), with `www` redirecting to the apex. |
| Breadcrumbs | Two kinds: the fixed **topic path** (Science › Physics › Electricity) and the reader's **reading trail**, built by following highlighted terms. |
| Labels | Big picture (high-level), Under the hood (low-level), Numbers & formulas (calculation), Fun facts (trivia), History (history). |
| Autonomy | Once the key decisions are made, the owner prefers work carried end to end without intermediate reviews. |

## What success looks like

- A child opens an article, understands the short answer and the main text alone, clicks
  highlighted words to learn them, and can always find the way back.
- A parent opens "Go deeper" and gets the precise, correct version.
- Anyone finds an article by search, by the topic tree, or by filtering on the kind of explanation.
- The 1,000th article is as easy to add as the 10th. A new language needs no restructuring.

## First content

1. How electric current works (big picture), how it is calculated (numbers & formulas) and how it
   behaves (under the hood). Each has its own supporting term articles.
2. How air conditioners and heat pumps work. "AC" means air conditioning: an air conditioner is a
   heat pump that only runs one way.

The full design is in `docs/superpowers/specs/2026-09-28-guydeatory-platform-design.md`.
