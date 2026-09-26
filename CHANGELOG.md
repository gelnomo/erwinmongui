# Changelog

Notable changes to erwinmongui.com. Each version has a `## vX.Y.Z` heading; pushing a matching tag, or running the Release workflow from the Actions tab with that version, publishes the section as a GitHub release (see `.github/workflows/release.yml`).

## v1.4.0 (2026-09-26)

### Google Analytics

- Every hit now says what kind of page it came from: GA's built-in content group (Home, Case study, Article, Listing, About, Not found), plus `content_id` (the same for the English and Spanish versions of a page) and `site_language`.
- Contact clicks are one key event, `generate_lead`, with `method` (email or linkedin) and where on the page the click happened. It replaces `email_click` and the contact use of `cta_click`. The email address is no longer sent.
- New `preferred_source_click` for Google's button at the end of case studies and articles (not tracked before) and the footer link.
- New `language_switch` event for the English / Español switch.
- Case studies and articles now report the heading a reader reached (`section_view`) and `article_read` when a reader reaches the end, marked `read` or `skim` by active time against expected reading time.
- Fewer, clearer events. Removed: right clicks, Tab presses, paste, cut, text selections, print, section exits, time milestones, deep-link arrivals, skills-rail views and arrows, and the custom duplicates of GA's own scroll, outbound click and file download events. The five kinds of clicks on non-links are one `dead_click` event. Scroll depth is 25, 50, 75 and 100 %, and only after a real scroll.
- `page_exit` is sent once per page view, not every time the tab is hidden.
- `exception` only reports errors in this site's own scripts, with file and line.
- ANALYTICS.md lists every event and the exact GA setup: key events, custom definitions and settings.

## v1.3.1 (2026-09-26)

### SEO fixes

- Every page's meta description now fits the 25 to 160 characters that Google and Bing show in search results. Four descriptions were slightly too long (the Spanish homepage, the Spanish migration case study, the Spanish analyst article and the RT-PCR paper), and the 404 page had none. Bing Webmaster Tools flagged this as "Meta Description too long or too short".
- The Spanish homepage's social preview text (Open Graph and X) is also shorter.
- The build now stops with a clear error if any description is missing or out of range, so this can't come back.

## v1.3.0 (2026-09-26)

### Fixes

- The header on inner pages now matches the homepage: the brand on the left, the section links in the middle, and the language switch and Contact on the right. A leftover mobile rule had pushed the links after Contact.
- Sections on inner pages have their side padding again. The same leftover code had broken the next CSS rule, so some lists, like the Writing page, touched the screen edges.
- The build now stops with a clear error if a stylesheet has unbalanced braces, so this kind of mistake can't reach the site again.

### Google preferred sources

- Every case study and article, in English and Spanish, ends with a dark strip: "Get my next case studies and articles in Google Search", with Google's Add to Preferred Sources button. Spanish pages show "Añadir a fuentes preferidas".
- Google's script loads only on those pages.
- The Spanish footer link now says "Añadir como fuente preferida en Google", matching Google's own wording.

## v1.2.0 (2026-09-26)

### One header and one footer everywhere

- Every page now uses the same header and footer, written by `src/build.py` and styled by the new `assets/chrome.css`: the homepage, the inner pages, the Spanish pages and the 404 page. The build writes them into `index.html` between `<!-- site-header -->` and `<!-- site-footer -->` markers.
- The header links are the same on every page: About, Experience, Impact, AI, Skills, Case studies, Writing and Quick facts, plus the language switch and Contact. On the homepages they scroll to the section; elsewhere they open it.
- The mobile menu button now works on every page (`assets/chrome.js` for the inner pages).

### Email address

- The email address no longer appears as text anywhere. Visitors reach it through the Email button, which links to it.
- The 404 page shows Email and LinkedIn buttons instead of the address.
- `llms.txt` points to the contact section.
- The hidden `email` field is removed from the structured data.

## v1.1.0 (2026-09-26)

### Spanish homepage

- `/es/` is now a full Spanish translation of the homepage, with the same sections and scroll effects as the English one:
  - the hero fade;
  - the word-by-word reveal of the About paragraph;
  - the stacking experience cards, the counters and the skills rail;
  - education, all 24 certifications, the FAQ and contact.
- It's generated from `index.html` with the pairs in `src/home_es.py`, so both versions keep the same design and scripts. The build warns when English text has no translation.
- Spanish structured data: ProfilePage and FAQPage in Spanish.
- The homepage now loads `analytics.js` and the award image from absolute paths, so the copy under `/es/` works.

## v1.0.0 (2026-09-26)

The site grows from a single page into a 26-page site in English and Spanish, built for search engines and AI assistants.

### New pages

- Three case studies under `/work/`:
  - Fincaraiz monolith to microservices;
  - Fincaraiz lead distribution for any CRM;
  - the Cedar Planters data platform.
- Seven articles under `/writing/`, including updated versions of three LinkedIn articles and the STEM Fellowship RT-PCR paper.
- An About page with the career story, leadership principles, the Adevinta award and all certifications.
- A Spanish home page, the three case studies (`/es/casos/`) and all seven articles (`/es/articulos/`).
- A bilingual 404 page that suggests matching pages and records `page_not_found` in Google Analytics.

### Homepage

- New case study and writing sections.
- Nav and footer links to the new pages.
- Three new FAQ answers.
- Language tags pointing to the Spanish version.

### SEO and AI search

- Canonical URLs, Open Graph tags and English and Spanish language alternates on every page.
- Structured data for articles, collections, the profile, FAQs and breadcrumbs, with a citation for the published paper.
- A sitemap with all 26 pages.
- RSS feeds in English and Spanish.
- An expanded `llms.txt` and a new `llms-full.txt` with the full text of every case study and article.

### Build

- Inner pages are generated by `src/build.py` from `src/pages.json` and `src/content/`, using the Python standard library only.

### Earlier

- Google preferred sources button on the homepage and footer link (PR #7).
