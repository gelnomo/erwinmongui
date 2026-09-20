# erwinmongui.com

Source of the personal website of Erwin Mongui, software engineering leader in Toronto.

The site is a single static page. There is no build step and no framework: `index.html` holds the markup and the CSS, `analytics.js` holds the Google Analytics 4 event tracking, and the remaining files are images, icons and site metadata.

## Hosting

The site is served by GitHub Pages from the default branch of this repository. The `CNAME` file binds it to the custom domain `erwinmongui.com`. A push to the default branch deploys automatically.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole page: markup, styles, structured data, third-party tags |
| `analytics.js` | Custom GA4 events. Documented in [ANALYTICS.md](ANALYTICS.md) |
| `ads.txt` | Authorised seller entry for Google AdSense |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Crawler and search metadata |
| `site.webmanifest`, `favicon*`, `apple-touch-icon.png` | Icons and web app manifest |
| `og-image.png` | Social sharing preview image |
| `erwin-mongui-logo.svg`, `erwin-mongui-mark.svg` | Brand assets |
| `CNAME` | Custom domain for GitHub Pages |

## Working locally

Any static file server works. For example:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Append `?ga_debug=1` to print analytics events to the browser console (see `ANALYTICS.md`).

## Copyright

Copyright (c) 2026 Erwin Mongui. All rights reserved.

This repository is public so that the site can be hosted, not so that it can be reused. The code, design, text and images may not be copied or republished without written permission. See [LICENSE](LICENSE) for the full notice.
