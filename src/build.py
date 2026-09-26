#!/usr/bin/env python3
"""
Static page builder for erwinmongui.com.

The homepage (index.html) is hand-written. Every other page is generated from
two sources in this folder:

  pages.json         one entry per page: URL, language, title, description,
                     dates, breadcrumbs, language alternates and schema extras
  content/<key>.html the page body (header and sections), written as plain HTML

Running `python3 src/build.py` from the repository root writes:

  <url>/index.html   every page in pages.json, with head tags, structured data,
                     navigation, footer and tracking scripts
  404.html           the page GitHub Pages shows for a missing address
  es/index.html      the Spanish homepage: index.html with the translations
                     in home_es.py applied, so it keeps the same effects
  sitemap.xml        every page, with hreflang alternates
  feed.xml           RSS feed of case studies and articles (English)
  es/feed.xml        the same feed for the Spanish pages
  llms.txt           short guide to the site for AI assistants
  llms-full.txt      the full text of every page, for AI assistants

Standard library only. Commit the generated files: GitHub Pages serves the
repository as it is, with no build step of its own.
"""
import html
import json
import re
from datetime import date
from email.utils import format_datetime
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
SITE = "https://erwinmongui.com"
PERSON_ID = SITE + "/#person"
WEBSITE_ID = SITE + "/#website"
LINKEDIN = "https://www.linkedin.com/in/erwin-mongui/"
EMAIL = "erwinmongui@gmail.com"
OG_IMAGE = SITE + "/og-image.png"
HOME = {"key": "home", "url": "/", "lang": "en", "headline": "Erwin Mongui", "modified": "2026-09-26",
        "title": "Erwin Mongui, Engineering Leader and Director of Technology in Toronto",
        "description": "Erwin Mongui, software engineering leader in Toronto: Director of Technology at Cedar Planters, "
                       "Certified AI Engineer, 18+ years building customer platforms."}

MARK_PATH = (ROOT / "src" / "mark.path").read_text().strip()

TEXT = {
    "en": {"home": "/", "contact": ("Contact", "/#contact"), "switch": ("Español", "es"), "skip": "Skip to content",
           "rights": "All rights reserved.", "pref": "Add as a preferred source on Google", "nav_label": "Sections",
           "menu": "Open menu",
           "nav": [("About", "/about/"), ("Experience", "/#experience"), ("Impact", "/#impact"), ("AI", "/#ai"),
                   ("Skills", "/#skills"), ("Case studies", "/work/"), ("Writing", "/writing/"), ("Quick facts", "/#facts")],
           "footer": [("Case studies", "/work/"), ("Writing", "/writing/"), ("About", "/about/")]},
    "es": {"home": "/es/", "contact": ("Contacto", "/es/#contacto"), "switch": ("English", "en"), "skip": "Ir al contenido",
           "rights": "Todos los derechos reservados.", "pref": "Agregar como fuente preferida en Google", "nav_label": "Secciones",
           "menu": "Abrir menú",
           "nav": [("Sobre mí", "/about/"), ("Experiencia", "/es/#experience"), ("Impacto", "/es/#impact"), ("IA", "/es/#ai"),
                   ("Habilidades", "/es/#skills"), ("Casos", "/es/#casos"), ("Artículos", "/es/articulos/"), ("Preguntas", "/es/#facts")],
           "footer": [("Casos", "/es/#casos"), ("Artículos", "/es/articulos/"), ("Sobre mí", "/about/")]},
}
LOCALE = {"en": "en_CA", "es": "es_CO"}


def load_pages():
    pages = json.loads((SRC / "pages.json").read_text())
    by_key = {p["key"]: p for p in pages}
    by_key["home"] = HOME
    return pages, by_key


def abs_url(path):
    return SITE + path


def esc(s):
    return html.escape(s, quote=True)


# ---------- structured data ----------

def person_node():
    return {"@type": "Person", "@id": PERSON_ID, "name": "Erwin Mongui", "url": SITE + "/",
            "jobTitle": "Director of Technology", "worksFor": {"@type": "Organization", "name": "Cedar Planters"},
            "sameAs": [LINKEDIN]}


def website_node():
    return {"@type": "WebSite", "@id": WEBSITE_ID, "url": SITE + "/", "name": "Erwin Mongui",
            "publisher": {"@id": PERSON_ID}, "inLanguage": ["en", "es"]}


def breadcrumb_node(p):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": name, "item": abs_url(url)}
        for i, (name, url) in enumerate(p["breadcrumbs"])]}


def jsonld(p, by_key):
    url = abs_url(p["url"])
    graph = [person_node(), website_node()]
    t = p["type"]
    if t in ("case", "post"):
        art = {"@type": "BlogPosting" if t == "post" else "Article", "@id": url + "#article",
               "headline": p["headline"][:110], "description": p["description"], "url": url,
               "mainEntityOfPage": url, "inLanguage": p["lang"], "image": OG_IMAGE,
               "datePublished": p["published"], "dateModified": p["modified"],
               "author": [{"@id": PERSON_ID}] + [{"@type": "Person", "name": n} for n in p.get("coauthors", [])],
               "publisher": {"@id": PERSON_ID}, "isPartOf": {"@id": WEBSITE_ID}}
        for k in ("keywords", "about", "citation", "sameAs"):
            if p.get(k):
                art[k] = p[k]
        if p.get("section"):
            art["articleSection"] = p["section"]
        if p.get("code"):
            art["isBasedOn"] = {"@type": "SoftwareSourceCode", "codeRepository": p["code"],
                                "programmingLanguage": "Python"}
        graph.append(art)
    elif t == "collection":
        graph.append({"@type": "CollectionPage", "@id": url, "url": url, "name": p["headline"],
                      "description": p["description"], "inLanguage": p["lang"], "isPartOf": {"@id": WEBSITE_ID},
                      "mainEntity": {"@type": "ItemList", "itemListElement": [
                          {"@type": "ListItem", "position": i + 1, "url": abs_url(by_key[k]["url"]),
                           "name": by_key[k]["headline"]} for i, k in enumerate(p["items"])]}})
    elif t == "about":
        graph.append({"@type": "AboutPage", "@id": url, "url": url, "name": p["headline"],
                      "description": p["description"], "inLanguage": "en", "mainEntity": {"@id": PERSON_ID},
                      "isPartOf": {"@id": WEBSITE_ID}, "dateModified": p["modified"]})
    elif t == "home-es":
        graph.append({"@type": "ProfilePage", "@id": url, "url": url, "name": p["title"],
                      "description": p["description"], "inLanguage": "es", "mainEntity": {"@id": PERSON_ID},
                      "isPartOf": {"@id": WEBSITE_ID}, "dateModified": p["modified"]})
        faq = faq_from_content(p)
        if faq:
            graph.append(faq)
    graph.append(breadcrumb_node(p))
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=1)


def faq_from_content(p):
    body = (SRC / "content" / (p["key"] + ".html")).read_text()
    pairs = re.findall(r'<div class="fact"><h3>(.*?)</h3><p>(.*?)</p></div>', body, re.S)
    if not pairs:
        return None
    strip = lambda s: html.unescape(re.sub(r"<[^>]+>", "", s)).strip()
    return {"@type": "FAQPage", "@id": abs_url(p["url"]) + "#faq", "inLanguage": p["lang"],
            "mainEntity": [{"@type": "Question", "name": strip(q),
                            "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in pairs]}


# ---------- page shell ----------

def alternates(p, by_key):
    alt = by_key.get(p.get("alternate", ""))
    if not alt:
        return ""
    pair = {p["lang"]: p["url"], alt["lang"]: alt["url"]}
    tags = [f'<link rel="alternate" hreflang="{lang}" href="{abs_url(u)}">' for lang, u in sorted(pair.items())]
    tags.append(f'<link rel="alternate" hreflang="x-default" href="{abs_url(pair["en"])}">')
    return "\n".join(tags)


def head(p, by_key):
    url = abs_url(p["url"])
    is_article = p["type"] in ("case", "post")
    og_type = "article" if is_article else "website"
    art_meta = ""
    if is_article:
        art_meta = (f'<meta property="article:published_time" content="{p["published"]}">\n'
                    f'<meta property="article:modified_time" content="{p["modified"]}">\n'
                    f'<meta property="article:author" content="{LINKEDIN}">')
    alt_locale = ""
    if p.get("alternate") in by_key:
        other = by_key[p["alternate"]]["lang"]
        alt_locale = f'<meta property="og:locale:alternate" content="{LOCALE[other]}">'
    return f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(p["title"])}</title>
<meta name="description" content="{esc(p["description"])}">
<meta name="author" content="Erwin Mongui">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<meta name="theme-color" content="#000000">
<link rel="canonical" href="{url}">
{alternates(p, by_key)}
{feed_link(p)}
<link rel="me" href="{LINKEDIN}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Erwin Mongui">
<meta property="og:locale" content="{LOCALE[p["lang"]]}">
{alt_locale}
<meta property="og:url" content="{url}">
<meta property="og:title" content="{esc(p["headline"])}">
<meta property="og:description" content="{esc(p["description"])}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Erwin Mongui logo with the words Engineering leader, Director of Technology, Toronto, Canada">
{art_meta}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(p["headline"])}">
<meta name="twitter:description" content="{esc(p["description"])}">
<meta name="twitter:image" content="{OG_IMAGE}">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/chrome.css">
<script type="application/ld+json">
{jsonld(p, by_key)}
</script>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-LKD2WCNDV1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-LKD2WCNDV1');
</script>
<!-- Clarity tracking code for https://erwinmongui.com/ -->
<script>
    (function(c,l,a,r,i,t,y){{
        c[a]=c[a]||function(){{(c[a].q=c[a].q||[]).push(arguments)}};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    }})(window, document, "clarity", "script", "ygo6nehxdb");
</script>
<script defer src="/analytics.js"></script>"""


def feed_link(p):
    if p["lang"] == "es":
        return f'<link rel="alternate" type="application/rss+xml" title="Erwin Mongui: casos y artículos" href="{SITE}/es/feed.xml">'
    return f'<link rel="alternate" type="application/rss+xml" title="Erwin Mongui: case studies and writing" href="{SITE}/feed.xml">'


MENU_ICONS = ('<svg class="bars" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 5h14M2 9h14M2 13h14"/></svg>\n'
              '        <svg class="x" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l10 10M14 4L4 14"/></svg>')


def site_header(lang, url, switch_href, is_home=False):
    """The one header every page uses, homepage included. On a homepage, links to
    its own sections become plain #anchors so they scroll instead of reloading."""
    t = TEXT[lang]
    home = t["home"]
    def local(href):
        return href[len(home):] if is_home and href.startswith(home + "#") else href
    links = []
    for label, href in t["nav"]:
        current = not is_home and "#" not in href and url.startswith(href)
        if href == "/es/#casos" and url.startswith("/es/casos/"):
            current = True
        cur = ' aria-current="page"' if current else ""
        links.append(f'<a href="{local(href)}"{cur}>{label}</a>')
    label, other = t["switch"]
    brand = "#top" if is_home else home
    return f"""<header class="nav" id="nav">
  <div class="nav-inner">
    <a class="brand" href="{brand}"><svg aria-hidden="true" focusable="false" viewBox="0 0 189 190"><path fill="#81ffd9" d="{MARK_PATH}"/></svg><span>Erwin Mongui</span></a>
    <nav class="nav-links" id="nav-links" aria-label="{t["nav_label"]}">
      {chr(10).join("      " + l if i else l for i, l in enumerate(links))}
    </nav>
    <div class="nav-right">
      <a class="nav-lang" href="{switch_href}" hreflang="{other}" lang="{other}">{label}</a>
      <a class="nav-cta" href="{local(t["contact"][1])}">{t["contact"][0]}</a>
      <button class="menu-btn" id="menu-btn" aria-label="{t["menu"]}" aria-expanded="false" aria-controls="nav-links">
        {MENU_ICONS}
      </button>
    </div>
  </div>
</header>"""


def site_footer(lang, switch_href, is_home=False):
    """The one footer every page uses, homepage included."""
    t = TEXT[lang]
    home = t["home"]
    def local(href):
        return href[len(home):] if is_home and href.startswith(home + "#") else href
    label, other = t["switch"]
    links = [f'<a href="{local(h)}">{n}</a>' for n, h in t["footer"]]
    links.append(f'<a href="{switch_href}" lang="{other}" hreflang="{other}">{label}</a>')
    links.append(f'<a href="https://www.google.com/preferences/source?q=erwinmongui.com" target="_blank" rel="noopener">{t["pref"]}</a>')
    links.append(f'<a href="{LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a>')
    return f"""<footer class="foot">
  <div class="foot-inner">
    <p class="foot-brand"><svg aria-hidden="true" focusable="false" viewBox="0 0 189 190"><path fill="#81ffd9" d="{MARK_PATH}"/></svg><span>Erwin Mongui, Toronto</span></p>
    <p class="foot-copy">&copy; {date.today().year} Erwin Mongui. {t["rights"]}</p>
    <p>{" &middot; ".join(links)}</p>
  </div>
</footer>"""


def switch_for(p, by_key):
    alt = by_key.get(p.get("alternate", ""))
    return alt["url"] if alt else ("/" if p["lang"] == "es" else "/es/")


def nav(p, by_key):
    return f'<a class="skip" href="#main">{TEXT[p["lang"]]["skip"]}</a>\n' + site_header(p["lang"], p["url"], switch_for(p, by_key))


def footer(p, by_key):
    return site_footer(p["lang"], switch_for(p, by_key))


def inject(page, name, content):
    """Puts the shared header or footer between <!-- site-NAME --> markers.
    The first time, it wraps the page's existing <header class="nav"> or <footer class="foot">."""
    start, end = f"<!-- site-{name} -->", f"<!-- /site-{name} -->"
    block = f"{start}\n{content}\n{end}"
    if start in page:
        a, b = page.index(start), page.index(end) + len(end)
        return page[:a] + block + page[b:]
    tag = {"header": ('<header class="nav" id="nav">', "</header>"), "footer": ('<footer class="foot">', "</footer>")}[name]
    a = page.index(tag[0]); b = page.index(tag[1], a) + len(tag[1])
    return page[:a] + block + page[b:]


def render(p, by_key):
    body = (SRC / "content" / (p["key"] + ".html")).read_text().replace("__MARK__", MARK_PATH)
    return f"""<!DOCTYPE html>
<html lang="{p["lang"]}">
<head>
{head(p, by_key)}
</head>
<body class="chrome-sticky">
{nav(p, by_key)}
<main id="main">
{body}
</main>
{footer(p, by_key)}
<script defer src="/assets/chrome.js"></script>
</body>
</html>
"""


# ---------- Spanish homepage ----------

def render_home_es():
    """/es/index.html is the English homepage with every string translated
    (see home_es.py), so both languages share the same design, scroll effects
    and tracking. Returns the page and the English strings that no longer match."""
    import sys
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(SRC))
    import home_es

    src = (ROOT / "index.html").read_text()
    m = re.search(r'(<script type="application/ld\+json">\n)(.*?)(\n</script>)', src, re.S)
    data = json.loads(m.group(2))
    out = src[:m.start(2)] + "__JSONLD__" + src[m.end(2):]

    missing = []
    for en, es in sorted(home_es.PAIRS, key=lambda pair: -len(pair[0])):
        if en not in out:
            missing.append(en)
            continue
        out = out.replace(en, es)

    strip = lambda t: html.unescape(re.sub(r"<[^>]+>", "", t)).strip()
    facts = re.findall(r'<div class="fact">\s*<h3>(.*?)</h3>\s*<p>(.*?)</p>', out, re.S)
    for node in data.get("@graph", []):
        kind = node.get("@type")
        if kind == "Person" and "description" in node:
            node["description"] = home_es.PERSON_DESCRIPTION
        elif kind == "ProfilePage":
            node.update({"@id": SITE + "/es/#profile", "url": SITE + "/es/", "name": home_es.PROFILE_NAME,
                         "description": home_es.PROFILE_DESCRIPTION, "inLanguage": "es"})
        elif kind == "FAQPage":
            node.update({"@id": SITE + "/es/#facts", "url": SITE + "/es/#facts", "inLanguage": "es",
                         "mainEntity": [{"@type": "Question", "name": strip(q),
                                         "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in facts]})
    out = out.replace("__JSONLD__", json.dumps(data, ensure_ascii=False, indent=2))
    out = inject(out, "header", site_header("es", "/es/", "/", is_home=True))
    out = inject(out, "footer", site_footer("es", "/", is_home=True))
    return out, missing


# ---------- 404 page ----------

def render_404(pages, by_key):
    """The page GitHub Pages serves for any missing address. Bilingual, not indexed,
    and it suggests real pages that match words in the requested address."""
    index = [{"url": p["url"], "title": p["headline"], "lang": p["lang"]} for p in [HOME] + pages]
    body = ((SRC / "content" / "404.html").read_text()
            .replace("__MARK__", MARK_PATH)
            .replace("__PAGES__", json.dumps(index, ensure_ascii=False).replace("</", "<\\/"))
            .replace("__ES_HEADER__", site_header("es", "/404.html", "/"))
            .replace("__ES_FOOTER__", site_footer("es", "/")))
    p = {"key": "404", "lang": "en", "url": "/404.html"}
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found | Erwin Mongui</title>
<meta name="robots" content="noindex, follow">
<meta name="theme-color" content="#000000">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/chrome.css">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-LKD2WCNDV1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-LKD2WCNDV1');
</script>
<!-- Clarity tracking code for https://erwinmongui.com/ -->
<script>
    (function(c,l,a,r,i,t,y){{
        c[a]=c[a]||function(){{(c[a].q=c[a].q||[]).push(arguments)}};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    }})(window, document, "clarity", "script", "ygo6nehxdb");
</script>
<script defer src="/analytics.js"></script>
</head>
<body class="chrome-sticky">
{nav(p, by_key)}
<main id="main">
{body}
</main>
{footer(p, by_key)}
<script defer src="/assets/chrome.js"></script>
</body>
</html>
"""


# ---------- sitemap, feed ----------

def sitemap(pages, by_key):
    rows = []
    for p in [HOME] + pages:
        alts = ""
        alt = by_key.get(p.get("alternate", "")) if p is not HOME else by_key["es"]
        if alt:
            pair = {p["lang"]: p["url"], alt["lang"]: alt["url"]}
            alts = "".join(f'\n    <xhtml:link rel="alternate" hreflang="{l}" href="{abs_url(u)}"/>'
                           for l, u in sorted(pair.items()))
            alts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{abs_url(pair["en"])}"/>'
        images = ""
        if p is HOME:
            images = ("\n    <image:image>\n      <image:loc>https://erwinmongui.com/og-image.png</image:loc>\n"
                      "      <image:title>Erwin Mongui, Engineering Leader and Director of Technology, Toronto</image:title>\n"
                      "    </image:image>")
        if p["key"] == "about":
            images = ("\n    <image:image>\n      <image:loc>https://erwinmongui.com/culture-awards-2019.jpg</image:loc>\n"
                      "      <image:title>Adevinta Culture Awards 2019 finalist diploma awarded to Erwin Mongui</image:title>\n"
                      "    </image:image>")
        rows.append(f"  <url>\n    <loc>{abs_url(p['url'])}</loc>\n    <lastmod>{p['modified']}</lastmod>{alts}{images}\n  </url>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
            '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n'
            '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
            + "\n".join(rows) + "\n</urlset>\n")


def rfc822(d):
    y, m, dd = map(int, d.split("-"))
    return format_datetime(datetime(y, m, dd, 12, 0, tzinfo=timezone.utc))


FEED = {"en": ("Erwin Mongui: case studies and writing", "/feed.xml", "/",
                "Case studies and articles by Erwin Mongui on platform architecture, data, AI and engineering leadership."),
        "es": ("Erwin Mongui: casos y artículos", "/es/feed.xml", "/es/",
               "Casos de estudio y artículos de Erwin Mongui sobre arquitectura de plataformas, datos, IA y liderazgo en ingeniería.")}


def feed(pages, lang="en"):
    title, path, home, about = FEED[lang]
    items = sorted([p for p in pages if p["type"] in ("case", "post") and p["lang"] == lang],
                   key=lambda p: p["published"], reverse=True)
    out = []
    for p in items:
        out.append(f"""  <item>
    <title>{esc(p["headline"])}</title>
    <link>{abs_url(p["url"])}</link>
    <guid isPermaLink="true">{abs_url(p["url"])}</guid>
    <pubDate>{rfc822(p["published"])}</pubDate>
    <category>{esc(p.get("section", ""))}</category>
    <description>{esc(p["description"])}</description>
  </item>""")
    newest = max(p["modified"] for p in items)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>{title}</title>
  <link>{SITE}{home}</link>
  <atom:link href="{SITE}{path}" rel="self" type="application/rss+xml"/>
  <description>{about}</description>
  <language>{lang}</language>
  <lastBuildDate>{rfc822(newest)}</lastBuildDate>
{chr(10).join(out)}
</channel>
</rss>
"""


# ---------- llms.txt and llms-full.txt ----------

class TextExtractor(HTMLParser):
    """Turns a page body into readable Markdown-like text for llms-full.txt."""
    BLOCK = {"p", "li", "h1", "h2", "h3", "h4", "tr", "dt", "dd", "blockquote", "figcaption"}
    PREFIX = {"h1": "# ", "h2": "## ", "h3": "### ", "h4": "#### ", "li": "- ", "blockquote": "> ", "dd": "  "}
    VOID = {"br", "img", "hr", "input", "meta", "link", "source", "path"}

    def __init__(self):
        super().__init__()
        self.lines, self.buf, self.open = [], [], []  # open: [tag, skip, kind]
        self.pre = False

    def skipping(self):
        return any(o[1] for o in self.open)

    def handle_starttag(self, tag, attrs):
        if tag in self.VOID:
            if tag == "br":
                self.buf.append(" ")
            return
        cls = (dict(attrs).get("class") or "").split()
        skip = tag in ("svg", "script", "style", "nav", "button") or "byline" in cls
        parent_kpi = bool(self.open) and self.open[-1][2] == "kpi"
        kind = "node" if (tag == "div" and ("node" in cls or parent_kpi)) else ("kpi" if (tag == "div" and "kpi-row" in cls) else "")
        if tag in self.BLOCK or kind == "node" or tag == "pre":
            self.flush()
        if tag == "pre":
            self.pre = True
        if tag in ("td", "th") and "".join(self.buf).strip():
            self.buf.append(" | ")
        self.open.append([tag, skip, kind])

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        idx = next((i for i in range(len(self.open) - 1, -1, -1) if self.open[i][0] == tag), None)
        if idx is None:
            return
        entry = self.open[idx]
        if tag == "pre":
            code = "".join(self.buf).strip("\n")
            self.buf = []
            self.pre = False
            del self.open[idx:]
            if code:
                self.lines.append("```\n" + code + "\n```")
            return
        if tag == "b" and any(o[2] == "node" for o in self.open):
            self.buf.append(": ")
        del self.open[idx:]
        if tag in self.BLOCK:
            self.flush(self.PREFIX.get(tag, ""))
        elif entry[2] == "node":
            self.flush("- ", node=True)

    def handle_data(self, data):
        if self.skipping():
            return
        self.buf.append(data if self.pre else re.sub(r"\s+", " ", data))

    def flush(self, prefix="", node=False):
        text = "".join(self.buf).strip().strip("|").strip()
        if node:
            text = text.rstrip(": ")
        self.buf = []
        if text:
            self.lines.append(prefix + text)

    def text(self):
        self.flush()
        out = []
        for line in self.lines:
            if not out or line != out[-1]:
                out.append(line)
        return "\n\n".join(out)


def page_text(p):
    ex = TextExtractor()
    ex.feed((SRC / "content" / (p["key"] + ".html")).read_text())
    return ex.text()


def llms(pages, by_key):
    intro = (SRC / "llms-intro.md").read_text().strip()
    def line(k):
        p = by_key[k]
        return f"- [{p['headline']}]({abs_url(p['url'])}): {p['description']}"
    sections = [
        ("Case studies", ["case-migration", "case-crm", "case-data"]),
        ("Writing", by_key["writing"]["items"]),
        ("About", ["about"]),
        ("En español", ["es", "es-case-migration", "es-case-crm", "es-case-data", "es-writing"] + by_key["es-writing"]["items"]),
    ]
    parts = [intro, "## Pages\n\n- [Erwin Mongui, Engineering Leader in Toronto](https://erwinmongui.com/): full profile with experience, impact metrics, AI work, skills, education and certifications."]
    for title, keys in sections:
        parts.append(f"## {title}\n\n" + "\n".join(line(k) for k in keys))
    parts.append("## Optional\n\n- [Full text of every page](https://erwinmongui.com/llms-full.txt): all case studies and articles as plain text.\n"
                 "- [RSS feed](https://erwinmongui.com/feed.xml): new case studies and articles.")
    return "\n\n".join(parts) + "\n"


def llms_full(pages, by_key):
    intro = (SRC / "llms-intro.md").read_text().strip()
    order = ["case-migration", "case-crm", "case-data"] + by_key["writing"]["items"] + ["about"]
    parts = [intro, "This file contains the full text of every case study and article on erwinmongui.com. "
                    "Spanish translations of the case studies are available under https://erwinmongui.com/es/."]
    for k in order:
        p = by_key[k]
        dates = f"Published {p['published']}" + (f", updated {p['modified']}" if p["modified"] != p["published"] else "")
        parts.append(f"---\n\nURL: {abs_url(p['url'])}\n{dates}\n\n{page_text(p)}")
    return "\n\n".join(parts) + "\n"


# ---------- main ----------

def main():
    pages, by_key = load_pages()
    for p in pages:
        if p["key"] == "es":
            continue  # generated from index.html below
        out = ROOT / p["url"].strip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render(p, by_key))
        print("wrote", out.relative_to(ROOT))
    index = (ROOT / "index.html").read_text()
    index = inject(index, "header", site_header("en", "/", "/es/", is_home=True))
    index = inject(index, "footer", site_footer("en", "/es/", is_home=True))
    (ROOT / "index.html").write_text(index)
    print("updated the header and footer in index.html")
    es_home, missing = render_home_es()
    (ROOT / "es" / "index.html").write_text(es_home)
    print("wrote es/index.html (translated homepage)")
    for en in missing:
        print("WARNING: homepage text has no Spanish translation any more, update src/home_es.py:", en[:90])
    (ROOT / "404.html").write_text(render_404(pages, by_key))
    (ROOT / "sitemap.xml").write_text(sitemap(pages, by_key))
    (ROOT / "feed.xml").write_text(feed(pages, "en"))
    (ROOT / "es" / "feed.xml").write_text(feed(pages, "es"))
    (ROOT / "llms.txt").write_text(llms(pages, by_key))
    (ROOT / "llms-full.txt").write_text(llms_full(pages, by_key))
    print("wrote 404.html, sitemap.xml, feed.xml, es/feed.xml, llms.txt, llms-full.txt")


if __name__ == "__main__":
    main()
