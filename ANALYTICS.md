# Analytics

erwinmongui.com sends events to Google Analytics 4 property `G-LKD2WCNDV1`.

- The gtag.js snippet lives in the `<head>` of `index.html`.
- All custom events are defined in `analytics.js`. Nothing else on the page calls `gtag`.
- No personal data from visitors is collected. The only text sent is text that already appears on the page (what a visitor copied or selected), truncated to 100 characters. Pasted content is never sent.

## Testing

Open the site with `?ga_debug=1`. Every event is printed to the browser console as `[ga4] event_name {…}` and flagged with `debug_mode`, so it shows up in real time in GA4 under **Admin > DebugView**. Open with `?ga_debug=0` to turn it off. The flag is remembered in `localStorage`.

## Events

Every event carries `section` (the id of the section the interaction happened in: `hero`, `about`, `experience`, `impact`, `ai`, `skills`, `education`, `certifications`, `contact`, `nav`, `footer`) where it makes sense.

### Clicks

| Event | When | Key parameters |
|---|---|---|
| `nav_click` | Header link or brand logo | `nav_item`, `target_section`, `link_text` |
| `cta_click` | Any `.btn` or the nav Contact pill | `cta_style` (primary/ghost/outline/nav), `target_section`, `outbound`, `link_domain` |
| `email_click` | A `mailto:` link | `email_address`, `is_cta` |
| `copy_email` | "Copy email address" button | `method` (clipboard / mailto_fallback) |
| `certificate_click` | A credential link in Certifications | `certificate_name`, `provider`, `issued`, `certificate_group`, `link_domain` |
| `outbound_click` | Any other link to another domain | `link_text`, `link_url`, `link_domain` |
| `file_download` | A link with a `download` attribute (CV, when re-enabled) | `file_name`, `file_extension` |
| `anchor_click` / `link_click` | Other in-page or same-site links | `link_text`, `link_url`, `target_section` |
| `skip_link_click` | Accessibility "Skip to content" link | |
| `menu_toggle` | Mobile menu button | `action` (open / close) |
| `skills_rail_nav` | Skills rail arrows | `direction` (previous / next) |
| `button_click` | Any other button | `button_id`, `button_text` |
| `skill_chip_click` | A technology chip (not a link, so this shows intent) | `chip_text`, `card_title` |
| `skill_tile_click`, `metric_click`, `role_click`, `card_click` | Clicks on non-interactive cards. Useful for spotting "dead clicks" where people expect something to happen | `tile_name`, `metric_value`, `metric_label`, `company`, `role_title`, `card_title` |
| `context_menu` | Right click or long press | `on_link`, `link_url`, `target_element` |

### Reading behaviour

| Event | When | Key parameters |
|---|---|---|
| `scroll_depth` | Once each at 10, 25, 50, 75, 90 and 100 % of the page | `percent_scrolled`, `seconds_since_load`, `section` |
| `section_view` | First time a section reaches the middle of the viewport | `section_id`, `section_name`, `section_index`, `seconds_since_load`, `scroll_percent` |
| `section_exit` | A section leaves the middle of the viewport after at least 1 s | `section_id`, `time_in_section_sec`, `total_time_in_section_sec` |
| `role_view` | Each Experience card reaches the middle of the viewport (once) | `company`, `role_title`, `role_period`, `role_index` |
| `skill_tile_view` | Each skills tile becomes 60 % visible inside the rail while the section is on screen (once) | `tile_name`, `tile_index` |
| `text_select` | Visitor selects 20+ characters (debounced, max 15 per page) | `text_preview`, `text_length`, `word_count`, `section` |
| `content_copy` / `content_cut` | Visitor copies or cuts text | `text_preview`, `text_length`, `word_count`, `contains_email`, `section` |
| `content_paste` | Visitor pastes (content is not sent) | `section`, `target_element` |
| `print_page` | Browser print dialog opens | `section`, `max_scroll_percent` |

### Session quality

| Event | When | Key parameters |
|---|---|---|
| `engaged_time` | Once each at 10, 30, 60, 120, 300 and 600 s of active time. Time only counts while the tab is visible and the visitor moved, scrolled or typed in the last 60 s | `seconds`, `max_scroll_percent`, `section` |
| `page_exit` | Tab hidden or page unloaded (once per hide) | `reason`, `max_scroll_percent`, `active_seconds`, `sections_viewed`, `exit_section`, `time_in_exit_section_sec`, `click_count`, `copy_count`, `select_count`, `hidden_count` |
| `deep_link_arrival` | Page opened with a `#section` hash | `section_id` |
| `keyboard_navigation` | First Tab key press | `section` |
| `exception` | Uncaught JS error or unhandled promise rejection | `description`, `fatal` |

### User properties

Set once per visitor: `reduced_motion` (true / false), `color_scheme` (dark / light), `pointer_type` (coarse / fine).

## GA4 admin setup

Custom parameters are only visible in standard reports after they are registered. Do this once in **Admin > Data display > Custom definitions**.

Custom dimensions (event scope), in priority order:

`section`, `section_name`, `link_text`, `link_url`, `link_domain`, `target_section`, `cta_style`, `nav_item`, `certificate_name`, `provider`, `certificate_group`, `company`, `role_title`, `tile_name`, `chip_text`, `text_preview`, `method`, `direction`, `action`, `reason`, `exit_section`, `percent_scrolled`, `outbound`

Custom metrics (event scope):

`text_length`, `word_count`, `time_in_section_sec`, `total_time_in_section_sec`, `active_seconds`, `seconds_since_load`, `sections_viewed`, `click_count`, `copy_count`, `max_scroll_percent`

Custom user properties: `reduced_motion`, `color_scheme`, `pointer_type`.

GA4 allows 50 event-scoped dimensions and 50 metrics per property on the free tier, so the list above fits.

Mark as **Key events** (Admin > Events) so they appear as conversions:

- `email_click`
- `copy_email`
- `cta_click` (or build an audience on `link_domain = linkedin.com`)
- `certificate_click`
- `file_download`

Enhanced measurement (Admin > Data streams > stream > Enhanced measurement): leave it on. It adds `page_view`, `user_engagement`, `scroll` at 90 % and `click` for outbound links. Those overlap with `scroll_depth` and `outbound_click`, so use the custom events for reporting and keep the built-in ones as a sanity check.

## Suggested reports (Explore)

- **Funnel**: `page_view` → `section_view` (experience) → `section_view` (contact) → `email_click` or `copy_email`.
- **Section engagement**: `section_exit` by `section_name`, summed `time_in_section_sec` and average per session.
- **Read depth**: `scroll_depth` counts by `percent_scrolled`, split by device category.
- **What people copy or highlight**: `content_copy` and `text_select` by `text_preview` and `section`.
- **Credential interest**: `certificate_click` by `certificate_group` and `provider`.
- **Dead clicks**: `metric_click`, `role_click`, `skill_tile_click`, `skill_chip_click`. High counts suggest those elements should become links or expanders.
- **Recruiter signals**: `print_page`, `role_view` sequence, `time_in_exit_section_sec` for `experience`.
