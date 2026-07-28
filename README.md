# Decatur Espresso Demo Website

Demo site pitching Decatur Espresso (decaturespresso.com) on a modern web presence: a working
wholesale order catalog plus a brochure page selling Decatur to business owners and people
opening coffee shops. Everything is simulated; no orders are sent and no payments are taken.

**Strategy in one line:** let a wholesale buyer build their weekly order online as easily as the
paper order sheet, and let a prospect see in five seconds that Decatur runs serious coffee programs.

## Stack

Hand-coded static HTML/CSS/vanilla JS. No build step, no dependencies. Self-hosted fonts.
Deploys to Cloudflare Pages (framework preset: None, build output: `/`).

| File | Job |
| --- | --- |
| `index.html` + `styles.css` + `script.js` | Brochure/selling page |
| `shop.html` + `shop.css` + `shop.js` | Demo wholesale store (catalog, cart, demo checkout) |
| `products.js` | Generated catalog data (`window.DECATUR_CATALOG`) |
| `_internal/` | Gitignored: source PDFs, build script, uncompressed source images |

## Design tokens

| Token | Value | Source |
| --- | --- | --- |
| `--maroon` | `#732F37` | Sampled from tradeshow banner photos. Confirm exact print value with Decatur. |
| `--maroon-deep` | `#5A232A` | Derived darker stop for gradients |
| `--ink` | `#302310` | Sampled from their logo file |
| `--gold` | `#FF9900` | Sampled from their logo file; reserved for CTAs and accents |
| `--cream` | `#F6F1E7` | Page base |
| Display font | Archivo 600/700 (variable) | Self-hosted `assets/fonts/archivo-var.woff2` |
| Body font | Inter 400-700 (variable) | Self-hosted `assets/fonts/inter-var.woff2` |

## Catalog data

`products.js` is generated. Source of truth is the Sept 2025 Decatur price list, already imported as
`coffeeshop-portal/src/core/tenants/decatur-catalog.ts` (266 products). Regenerate with:

```
node _internal/build-products.mjs
```

The script maps 33 raw categories into 8 store groups, attributes brands by rule, builds pack
strings, and asserts counts (totals must sum to 266). Delivery route days in `shop.js` come from
the price list's delivery schedule page.

## Open items before this could go live for real

- The three Torani 64 oz sauce tubs price at $5.20 in the source sheet, which looks like a data
  error. Verify with Decatur before showing pricing publicly.
- `--maroon` is sampled from photographs of their banners. Get the exact brand value from their
  print files.
- Logo art is rebuilt from the low-resolution `logo.gif` on their current site. Ask Decatur for
  vector art.
- Photography is from their current site and 2024 brochure scans. A real shoot (machines, delivery
  van, the Harahan warehouse, staff) would lift the whole site.
- A production store needs customer accounts, real pricing tiers if any, order transmission
  (email or their back office), and a decision on whether prices stay public.
- Both pages carry `noindex` and demo ribbons. Remove for a production launch.

## What would make this real (pitch list for Decatur)

Findings from a deep review of Sam Crawford's web design material, applied where possible in the
demo; the rest needs Decatur's input or assets:

- **Photography.** Real photos of real work are today's top trust signal: techs at the bench, the
  route truck being loaded, the warehouse, a fresh install, the parts wall. Candid phone photos
  beat stock. This is the single highest-value missing asset and it costs nothing.
- **Two real case studies.** One 20-year account and one recent shop opening, told as problem,
  solution, result. Case studies outperform quote testimonials by a mile; we invented none.
- **Testimonial collection.** A two-question script route drivers can use: "What changed for you
  since switching to us?" and "Any specific numbers?" Specific beats glowing.
- **Named accounts.** A wall of recognizable local venues Decatur supplies (with permission)
  answers "has this worked for people like me" better than any adjective.
- **Confirm claims.** Exact "authorized dealer/service" wording per brand before production, the
  exact brand maroon from print files, and the $5.20 64 oz sauce-tub prices.
- **Owner control.** Production version should let Decatur update the 266-item price list from a
  spreadsheet, with a recorded handover video. Launch is the start, not the end.
- **Growth layer.** Location and industry landing pages ("espresso machines for restaurants in
  Baton Rouge") targeting one customer type each; machine spec panels and a build-your-program
  quote flow as a later phase.

## Deploy

GitHub repo: `https://github.com/Kpedeaux/DecaturEspresso` (remote `origin`, branch `main`).
Cloudflare Pages: connect the repo, framework None, output `/`. Suggested demo domain:
`decatur.creativecorerail.com`.

Local preview: Claude Code launch config `decatursite` (port 8841), or any static server from
the repo root.
