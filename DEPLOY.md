# Deploy website to streamlux.io

**streamlux.io is hosted from:** https://github.com/juneray808-jpg/streamlux-links  
(not from `my-first-project`)

This folder is a ready-to-publish copy of everything that should live in that repo.

## Quick deploy (on your machine)

```bash
git clone https://github.com/juneray808-jpg/streamlux-links.git
cd streamlux-links

# Copy from my-first-project after pulling latest:
cp -r ../my-first-project/streamlux-links-sync/* .
cp -r ../my-first-project/streamlux-links-sync/.well-known .well-known

git add -A
git commit -m "Deploy full StreamLux marketing website"
git push origin main
```

Vercel auto-deploys `streamlux.io` when you push to `main`.

## Android App Links (`assetlinks.json`)

Play Console verification **fails** until `/.well-known/assetlinks.json` includes the **Google Play App signing key** SHA-256 (not just the upload key). See `../docs/universal-links/AUDIT.md` in my-first-project.

```bash
# From my-first-project (after setting ANDROID_APP_SIGNING_KEY_SHA256 from Play Console):
npm run assetlinks:generate -- --out=../streamlux-links/.well-known/assetlinks.json
cd ../streamlux-links
git add .well-known/assetlinks.json
git commit -m "fix: add Play App signing SHA-256 to assetlinks.json"
git push origin main
npm run assetlinks:verify:play   # run from my-first-project
```

## Pages

| Page | URL |
|------|-----|
| Home | https://streamlux.io/ |
| About | https://streamlux.io/about.html |
| For Creators | https://streamlux.io/creators.html |
| Livestream | https://streamlux.io/livestream.html |
| Contact | https://streamlux.io/contact.html |
| Child safety | https://streamlux.io/child-safety.html |
| Privacy Policy | https://streamlux.io/privacy-policy.html |
| Account deletion | https://streamlux.io/account-deletion.html |
| AdMob app-ads.txt | https://streamlux.io/app-ads.txt |

Use these URLs in **Play Console** (Store listing → Privacy policy, App content → Data safety, Ads declaration).
