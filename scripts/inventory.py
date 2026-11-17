"""Inventory official episode write-ups; do not treat these as video reviews."""
import json, time, urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache'
CACHE.mkdir(exist_ok=True)
url = 'https://chefsfav.com/blog?format=json'
items = {}
pages = 0
while url:
    with urllib.request.urlopen(url, timeout=45) as response:
        data = json.load(response)
    pages += 1
    for item in data.get('items', []):
        items[item['id']] = item
    print(f'Page {pages}: {len(items)} articles', flush=True)
    nxt = data.get('pagination', {}).get('nextPageUrl')
    url = 'https://chefsfav.com' + nxt + '&format=json' if nxt else None
    time.sleep(.3)
(CACHE / 'articles.json').write_text(json.dumps(list(items.values()), ensure_ascii=False), encoding='utf-8')
episodes = []
for item in items.values():
    if 'mates on crates' not in item['title'].lower():
        continue
    soup = BeautifulSoup(item['body'], 'html.parser')
    episodes.append({'id': item['urlId'], 'title': item['title'],
                     'sourceUrl': 'https://chefsfav.com' + item['fullUrl'],
                     'publishedMs': item['publishOn'],
                     'text': soup.get_text('\n', strip=True),
                     'videoUrls': sorted(set(a['href'].split('?')[0] for a in soup.select('a[href]') if 'instagram.com/' in a['href'] and ('/reel/' in a['href'] or '/p/' in a['href']))),
                     'headings': [h.get_text(' ', strip=True) for h in soup.select('h1,h2,h3,h4')],
                     'lists': [[li.get_text(' ', strip=True) for li in ul.find_all('li', recursive=False)] for ul in soup.select('ul,ol')]})
(CACHE / 'episodes.json').write_text(json.dumps(episodes, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Inventory complete: {len(episodes)} official episode articles across {pages} pages.', flush=True)
