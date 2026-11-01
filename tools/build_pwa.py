"""Package app/ship-odditer.html as an installable, offline-capable PWA in docs/ (deployed to GitHub Pages by
.github/workflows/deploy.yml).

Usage:  python3 tools/build_pwa.py
Output: docs/  index.html, manifest.webmanifest, sw.js, version.json, sitemap.xml, data.json, targets/*.json,
               icons/*.webp, app-icons/*.png, fonts/*, .nojekyll   (docs/ is generated and not tracked by git)
Re-run after editing app/ship-odditer.html, app/data.json, or the icons (tools/update_data.sh runs it for you).
The service-worker cache version is a hash of every file, so installed copies pick up a new build by themselves.
"""
import base64, datetime, hashlib, json, os, re, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # repo root
SRC = os.path.join(ROOT, "app", "ship-odditer.html")
SITE = os.path.join(ROOT, "app")
OUT = os.path.join(ROOT, "docs")
os.makedirs(OUT, exist_ok=True)

page = open(SRC, encoding="utf-8").read()
cut = page.index("</style>") + len("</style>")
head_part, body_part = page[:cut], page[cut:]

# app/ship-odditer.html is the page body (styles, markup, script); the build wraps it in the document skeleton.
skeleton_css = """<style>
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0} img{max-width:100%} [hidden]{display:none!important}
</style>"""
# Rich link previews (iMessage, Discord, Slack, social sites) need absolute URLs, so they point at the live site
SITE_URL = "https://fleckeri.github.io/ship-odditer/"
SHARE_TITLE = "Ship Odditer: Egg Inc. Mission Drop Calculator"
SHARE_DESC = ("Drop odds for every Egg, Inc. ship, mission length, target, and star level, measured from player-logged "
              "missions. Adjusts to your research, simulates rewards, and works offline.")
# Structured data (schema.org) so search engines know this is a free web app about Egg, Inc.
STRUCTURED = {
    "@context": "https://schema.org", "@type": "WebApplication",
    "name": "Ship Odditer", "alternateName": "Egg Inc. Mission Drop Calculator",
    "url": SITE_URL, "description": SHARE_DESC, "image": SITE_URL + "app-icons/icon-512.png",
    "applicationCategory": "GameApplication", "operatingSystem": "Any", "browserRequirements": "Requires JavaScript",
    "inLanguage": "en", "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
    "about": {"@type": "VideoGame", "name": "Egg, Inc."},
    "author": {"@type": "Person", "name": "Fleckeri", "url": "https://github.com/Fleckeri"},
    "license": "https://opensource.org/licenses/MIT",
    "codeRepository": "https://github.com/Fleckeri/ship-odditer",
}
pwa_head = """<meta name="description" content="%(desc)s">
<meta name="theme-color" content="#f3f5f8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f141b" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="app-icons/favicon-light-64.png" media="(prefers-color-scheme: light)">
<link rel="icon" type="image/png" href="app-icons/favicon-dark-64.png" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="app-icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Ship Odditer">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="canonical" href="%(url)s">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ship Odditer">
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="%(desc)s">
<meta property="og:url" content="%(url)s">
<meta property="og:image" content="%(url)sapp-icons/icon-512.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta property="og:image:alt" content="Ship Odditer app icon: three nested eggs in blue, purple, and orange">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="%(title)s">
<meta name="twitter:description" content="%(desc)s">
<meta name="twitter:image" content="%(url)sapp-icons/icon-512.png">
<meta name="application-name" content="Ship Odditer">
<meta name="author" content="Fleckeri">
<meta name="robots" content="index, follow, max-image-preview:large">
<script type="application/ld+json">%(ld)s</script>""" % {"url": SITE_URL, "title": SHARE_TITLE, "desc": SHARE_DESC, "ld": json.dumps(STRUCTURED, separators=(",", ":"))}
# App version (from package.json) shown in the page footer and recorded in version.json
APP_VERSION = json.load(open(os.path.join(ROOT, "package.json")))["version"]
body_part = body_part.replace("__APP_VERSION__", APP_VERSION)
html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + pwa_head + "\n" + skeleton_css + "\n" + head_part + "\n</head>\n<body>" + body_part + "\n</body>\n</html>\n")
# Content Security Policy (GitHub Pages can't send headers, so it's a meta tag). Everything comes from this site;
# the inline scripts are allowed by their hashes, so nothing injected could run. Inline style attributes stay
# allowed (the page builds some markup with style="").
hashes = " ".join("'sha256-%s'" % base64.b64encode(hashlib.sha256(m.encode("utf-8")).digest()).decode()
                  for m in re.findall(r"<script>(.*?)</script>", html, re.S))
csp = ("default-src 'self'; script-src 'self' " + hashes + "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
       "font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; "
       "form-action 'none'")
html = html.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="%s">\n' % csp, 1)
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)

# Data and item/ship icons
# Data: app/ keeps readable JSON for people; the site gets it minified (about 20% smaller, and parsed faster)
def minify(src, dst):
    with open(src) as fh: obj = json.load(fh)
    with open(dst, "w") as fh: json.dump(obj, fh, separators=(",", ":"))
minify(os.path.join(SITE, "data.json"), os.path.join(OUT, "data.json"))
if os.path.isdir(os.path.join(OUT, "targets")): shutil.rmtree(os.path.join(OUT, "targets"))
os.makedirs(os.path.join(OUT, "targets"))
for f in sorted(os.listdir(os.path.join(SITE, "targets"))):
    if f.endswith(".json"): minify(os.path.join(SITE, "targets", f), os.path.join(OUT, "targets", f))
if os.path.isdir(os.path.join(OUT, "icons")): shutil.rmtree(os.path.join(OUT, "icons"))
shutil.copytree(os.path.join(SITE, "icons"), os.path.join(OUT, "icons"))
if os.path.isdir(os.path.join(OUT, "app-icons")): shutil.rmtree(os.path.join(OUT, "app-icons"))
shutil.copytree(os.path.join(SITE, "app-icons"), os.path.join(OUT, "app-icons"))
if os.path.isdir(os.path.join(OUT, "fonts")): shutil.rmtree(os.path.join(OUT, "fonts"))
shutil.copytree(os.path.join(SITE, "fonts"), os.path.join(OUT, "fonts"))  # self-hosted fonts and their licences
open(os.path.join(OUT, ".nojekyll"), "w").close()  # serve files as-is on GitHub Pages
# A one-page sitemap, for submitting the site in Google Search Console / Bing Webmaster Tools
open(os.path.join(OUT, "sitemap.xml"), "w").write(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    f'  <url><loc>{SITE_URL}</loc><lastmod>{datetime.date.today().isoformat()}</lastmod></url>\n</urlset>\n')

manifest = {
    "name": "Ship Odditer",
    "short_name": "Ship Odditer",
    "description": SHARE_DESC,
    "id": "./",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "orientation": "any",
    "background_color": "#0f1a2c",
    "theme_color": "#0f1a2c",
    "categories": ["games", "utilities"],
    "lang": "en",
    "dir": "ltr",
    "icons": [
        {"src": "app-icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "app-icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "app-icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
        {"src": "app-icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}
open(os.path.join(OUT, "manifest.webmanifest"), "w").write(json.dumps(manifest, indent=2))

# Service worker: precache everything; the version is a hash of the files so updates roll out
files = ["./", "index.html", "manifest.webmanifest", "data.json"]
files += ["targets/" + f for f in sorted(os.listdir(os.path.join(OUT, "targets")))]  # so targets work offline
files += ["icons/" + f for f in sorted(os.listdir(os.path.join(OUT, "icons")))]
files += ["app-icons/" + f for f in sorted(os.listdir(os.path.join(OUT, "app-icons")))]
files += ["fonts/" + f for f in sorted(os.listdir(os.path.join(OUT, "fonts"))) if f.endswith(".woff2")]
h = hashlib.sha256()
for f in files[1:]:
    h.update(open(os.path.join(OUT, f), "rb").read())
version = h.hexdigest()[:12]
# What this build contains. The deploy workflow compares the live copy with the current commit and upstream data
# to skip scheduled runs that would change nothing. Not precached: it's only read over the network.
data_date = json.load(open(os.path.join(SITE, "data.json")))["dataUpdated"]
open(os.path.join(OUT, "version.json"), "w").write(json.dumps({
    "app": APP_VERSION, "build": version, "data": data_date,
    "commit": os.environ.get("GITHUB_SHA", ""), "upstream": os.environ.get("UPSTREAM_COMMIT", ""),
}, indent=2) + "\n")
sw = """/* Ship Odditer service worker. Generated by build_pwa.py; version changes whenever any file changes. */
const VERSION = "%s";
const CACHE = "ship-odditer-" + VERSION;
const PRECACHE = %s;

// Install: download the whole new version (bypassing the browser's HTTP cache, which could still hold files from
// the previous deploy). If any file fails, e.g. offline, the install fails and the current version stays in charge.
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => (k.startsWith("ship-odditer-") || k.startsWith("drop-odds-")) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return;
  // App files: cache first, so the app works offline; a new version replaces the cache as a whole
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit ||
    fetch(req).catch(() => req.mode === "navigate" ? caches.match("index.html") : Response.error())));
});
""" % (version, json.dumps(files, indent=0))
open(os.path.join(OUT, "sw.js"), "w").write(sw)
print("version", version, "files", len(files))
