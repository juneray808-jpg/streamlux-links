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
| `/privacy-policy.html` | Privacy Policy (Play Console) |
| `/account-deletion.html` | Account & data deletion (Play Console) |
| `/open.html` | Deep-link fallback for `/post`, `/profile`, `/live` |

## Legal (streamlux.io — Play Console URLs)

- Privacy: `https://streamlux.io/privacy-policy.html`
- Account deletion: `https://streamlux.io/account-deletion.html`

## Do not remove

- `/.well-known/assetlinks.json`
- `vercel.json` rewrites for deep links
- `API/link.js` (legacy link handler)

## Source

Marketing site pages are maintained in sync with `my-first-project/website/` when updated.
