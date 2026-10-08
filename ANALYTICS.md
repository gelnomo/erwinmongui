# Analytics

erwinmongui.com sends events to Google Analytics 4 property `G-LKD2WCNDV1`.

- The gtag.js snippet is in the `<head>` of every page: `index.html` for the homepage (the Spanish homepage is generated from it), and `src/build.py` for every other page. `gtag.js` itself is requested on the visitor's first scroll, tap, key press or mouse move, or 4 seconds after the page has loaded, whichever comes first (`loadLater()` in `src/build.py`). Calls to `gtag()` made before then wait in `dataLayer` and are sent when it arrives. A visitor who leaves within those 4 seconds without interacting is not counted.
- The snippet defines `window.siteContext` and passes it to `gtag('config')`, so every hit carries three page facts:
  - `content_group`: GA's built-in content group. It is `Home`, `Case study`, `Article`, `Listing` (the case study and writing indexes), `About` or `Not found`.
  - `content_id`: the page, the same in both languages (`case-crm` for the English and Spanish CRM case study, `home` for both homepages).
  - `site_language`: `en` or `es`.
- All custom events are defined in `analytics.js`. The only other `gtag` call is `page_not_found`, on the 404 page.
- No personal data is sent. Email links send `method: email`, never the address. The only page text sent is text that already appears on the page, truncated to 100 characters.

## Consent

Every page sets Google Consent Mode v2 defaults before any tag loads (`tracking()` in `src/build.py`):
- In the EEA, the UK and Switzerland, `ad_storage`, `ad_user_data`, `ad_personalization` and `analytics_storage` start **denied**. They stay denied until the visitor answers Google's consent message, which is set up in AdSense > Privacy & messaging. While denied, GA4 sends cookieless pings and GA models the gaps.
- Everywhere else they start **granted**.

The homepages load the consent message through the AdSense tag. Every other page loads Google's standalone consent tag. `assets/consent.js` passes the answer to Clarity (`clarity('consentv2', …)`), and shows the footer's Privacy settings link, which reopens the message.

## Ahrefs Web Analytics

Every page also loads Ahrefs Web Analytics (`analytics.ahrefs.com/analytics.js`, site key `rdCxWS4nTARbSdPhwLuAmg`), written by `tracking()` in `src/build.py` after Clarity. It counts page views and referrers in the Ahrefs dashboard and receives none of the custom events above.

## Testing

Open the site with `?ga_debug=1`. Every event is printed to the browser console as `[ga4] event_name {…}` and flagged with `debug_mode`, so it shows up in real time in GA4 under **Admin > DebugView**. Open with `?ga_debug=0` to turn it off. The flag is remembered in `localStorage`.

Automated browser tests must block `google-analytics.com`, `/g/collect` and `analytics.ahrefs.com` requests, or their visits count as real traffic.

## Events

Most events carry `section`: where on the page it happened.
- `nav` or `footer`.
- On the homepage, the id of its section: `hero`, `about`, `experience`, `impact`, `ai`, `skills`, `education`, `certifications`, `case-studies`, `writing`, `facts` or `contact`.
- On case studies and articles, the heading the reader was under, e.g. `the-problem`.
- `preferred-source` for the strip at the end of case studies and articles.

### Key events

| Event | When | Parameters |
|---|---|---|
| `generate_lead` | A click on an email link or a LinkedIn profile link, anywhere on the site | `method` (email / linkedin), `section`, `link_text` |
| `preferred_source_click` | Google's "Add to preferred sources" button, or the footer link | `method` (button / link), `section` |

### Navigation

| Event | When | Parameters |
|---|---|---|
| `nav_click` | Header link or logo | `nav_item`, `target_section`, `link_url` |
| `cta_click` | A button-style link (`.btn`) or the header Contact button, unless it is a lead | `cta_style` (primary / ghost / outline / nav), `target_section`, `link_url` |
| `language_switch` | The English / Español switch, in the header, footer or page | `from_language`, `to_language`, `section` |
| `link_click` | Any other link on the site. Card links report their title | `link_text`, `link_url`, `target_section`, `section` |
| `outbound_click` | Any other link to another site | `link_domain`, `link_url`, `link_text` |
| `certificate_click` | A credential link in Certifications | `certificate_name`, `provider`, `issued`, `certificate_group` |
| `menu_toggle` | Mobile menu button | `action` (open / close) |

### Reading

| Event | When | Parameters |
|---|---|---|
| `section_view` | First time a homepage section crosses the middle of the screen, or an article heading reaches the top half | `section_id`, `section_name`, `section_index`, `seconds_since_load` |
| `role_view` | Each Experience card crosses the middle of the screen (once) | `company`, `role_title`, `role_index` |
| `scroll_depth` | Once each at 25, 50, 75 and 100 % of the page, after the visitor scrolls | `percent_scrolled`, `seconds_since_load`, `section` |
| `article_read` | Once, when a case study or article reader reaches the end of the text | `read_type` (read / skim), `word_count`, `active_seconds`, `expected_seconds` |
| `content_copy` | Visitor copies text | `text_preview`, `text_length`, `section` |
| `dead_click` | A click on something that looks clickable but isn't a link: skill chips and tiles, metrics, roles, education and AI cards | `element_type`, `element_label`, `section` |

`article_read` uses 230 words a minute for `expected_seconds`. `read_type` is `read` when `active_seconds` is at least 40 % of that, otherwise `skim`.

Active time only counts while the tab is visible and the visitor moved, scrolled or typed in the last 60 seconds.

### Session quality

| Event | When | Parameters |
|---|---|---|
| `page_exit` | Once per page view, when the tab is hidden or the page unloads | `reason`, `max_scroll_percent`, `active_seconds`, `sections_viewed`, `exit_section`, `exit_section_name`, `click_count`, `copy_count` |
| `exception` | A script error in this site's own files. Errors from ads, Clarity and Google's button are skipped | `description` (message, file and line), `fatal` |
| `page_not_found` | The 404 page | `page_path`, `page_referrer` |

### User properties

Set once per visitor: `reduced_motion` (true / false), `color_scheme` (dark / light), `pointer_type` (coarse / fine).

### Left to Enhanced measurement

Keep Enhanced measurement on (Admin > Data streams > stream > Enhanced measurement). It adds `page_view`, `session_start`, `first_visit`, `user_engagement` (engagement time), `scroll` at 90 %, `click` for outbound links and `file_download`. `analytics.js` doesn't send its own versions of these.

## GA4 admin setup

### Key events

Admin > Data display > Events > **Recent events**: star `generate_lead` and `preferred_source_click`. Unstar `email_click` and `cta_click` if they were starred; `generate_lead` replaces them. Events appear in this list only after GA receives one, which can take 24 to 48 hours.

### Custom definitions

Custom parameters are only visible in reports after they are registered, in **Admin > Data display > Custom definitions > Create custom dimension** (scope: Event). `content_group` needs no registration: it is GA's built-in **Content group** dimension.

Custom dimensions (event scope). Use the parameter name as the dimension name:

`content_id`, `site_language`, `section`, `method`, `link_text`, `link_url`, `link_domain`, `nav_item`, `target_section`, `cta_style`, `from_language`, `to_language`, `section_name`, `read_type`, `percent_scrolled`, `element_type`, `element_label`, `certificate_name`, `provider`, `certificate_group`, `company`, `role_title`, `exit_section_name`, `reason`, `text_preview`, `description`, `page_path`

Custom metrics (event scope, unit Standard):

`word_count`, `active_seconds`, `expected_seconds`, `max_scroll_percent`, `sections_viewed`, `click_count`, `seconds_since_load`, `text_length`

Custom dimensions (user scope): `reduced_motion`, `color_scheme`, `pointer_type`.

That is 27 event-scoped dimensions, 8 metrics and 3 user-scoped dimensions. A standard property allows 50 event-scoped dimensions, 50 metrics and 25 user-scoped dimensions.

### Other settings

- Admin > Data collection and modification > **Data retention**: 14 months.
- Admin > Data streams > stream > Configure tag settings > **Define internal traffic**, then Admin > Data collection and modification > **Data filters** > Internal Traffic > Active.
- Admin > Product links: link **Search Console** and **AdSense**.

## Suggested reports (Explore)

- **Leads by page**: `generate_lead` by Content group and `content_id`, split by `method`. Which pages turn readers into contacts.
- **Article performance**: `article_read` by `content_id` and `read_type`, next to `page_view` for the same pages. Read-through rate per case study and article.
- **Where articles lose readers**: `section_view` by `content_id` and `section_index`. The heading where counts drop is where readers leave.
- **English vs Spanish**: any of the above split by `site_language`. `content_id` lines up the two versions of a page.
- **Preferred sources**: `preferred_source_click` by `method` and `content_id`.
- **Homepage funnel**: `page_view` → `section_view` (experience) → `section_view` (contact) → `generate_lead`.
- **Dead clicks**: `dead_click` by `element_type` and `element_label`. High counts suggest those elements should become links.
