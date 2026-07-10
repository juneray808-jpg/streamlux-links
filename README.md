# streamlux-links

**streamlux.io** — StreamLux marketing site, deep-link fallbacks, and Android App Links.

Hosted on **Vercel** → domain `streamlux.io`.

## Pages

| Path | Purpose |
|------|---------|
| `/` | Marketing homepage |
| `/about.html` | About StreamLux |
| `/creators.html` | Creator monetization |
| `/livestream.html` | Upcoming live features |
| `/contact.html` | support@streamlux.io |
| `/child-safety.html` | Child safety standards (Play Store) |
| `/open.html` | Deep-link fallback for `/post`, `/profile`, `/live` |

## Legal (GitHub Pages — Play Console URLs unchanged)

- Privacy: `https://juneray808-jpg.github.io/my-first-project/privacy-policy.html`
- Account deletion: `https://juneray808-jpg.github.io/my-first-project/account-deletion.html`

## Do not remove

- `/.well-known/assetlinks.json`
- `vercel.json` rewrites for deep links
- `API/link.js` (legacy link handler)

## Source

Marketing site pages are maintained in sync with `my-first-project/website/` when updated.

## Playback Lab

`playback-lab/` — StreamLux vertical HLS playback engine laboratory (Expo Dev Client).  
See `playback-lab/README.md` and `playback-lab/docs/ARCHITECTURE.md`.  
Does not affect `streamlux.io` Vercel deployment (site root unchanged).
