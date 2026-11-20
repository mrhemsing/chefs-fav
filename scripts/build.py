"""Build factual recommendation indexes from official episode lists.

This deliberately does not label any episode as watched. Raw publisher prose is
cached locally only; committed data contains recommendation facts and citations.
"""
import csv, html, json, re, unicodedata
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data'
OUT.mkdir(exist_ok=True)
def norm(s):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower())
def clean(s):
    s = re.sub(r'\s+', ' ', html.unescape(s).replace('\u200d', '').replace('\u200b', '')).strip()
    for old, new in {'S hipyards C offee':'Shipyards Coffee', 'Downl ow':'Downlow', 'Hyd erabad Biry ani':'Hyderabad Biryani', 'D enny':'Denny', 'J u ne':'June', 'Dim S um':'Dim Sum', 'Yagot o':'Yagoto', 'B l ew':'Blew', 'Chris ENns':'Chris Enns', 'Oscar Holdago':'Oscar Holgado', 'Foglift er Cof fee':'Foglifter Coffee', 'C omo Taperia':'Como Taperia', 'The Flam ingo Room':'The Flamingo Room', 'HADA Coffe e':'HADA Coffee', 'Tap R estaurant':'Tap Restaurant', 'Sushi Ba r':'Sushi Bar'}.items():
        s = s.replace(old, new)
    return s
articles = json.loads((ROOT / '.cache/articles.json').read_text(encoding='utf-8'))
review = json.loads((OUT / 'editorial-review.json').read_text(encoding='utf-8'))
episodes, rows, excluded, unresolved = [], [], [], []
for article in articles:
    slug = article['urlId']
    if slug not in review:
        continue
    meta = review[slug]
    soup = BeautifulSoup(article['body'], 'html.parser')
    # A source bullet can contain multiple independent question paragraphs.
    for li in list(soup.select('li')):
        paragraphs = li.find_all('p', recursive=False)
        if len(paragraphs) > 1 and all(':' in p.get_text() for p in paragraphs):
            for p in paragraphs:
                replacement = soup.new_tag('li')
                replacement.append(p.extract())
                li.insert_before(replacement)
            li.decompose()
    title = clean(article['title'])
    guest = re.sub(r'^.*?[Ff]eat\.?\s*', '', title).strip(' ()')
    guest = re.sub(r'\s*\(20\d\d\)?$', '', guest)
    source = article['fullUrl']
    if source.startswith('/'):
        source = 'https://chefsfav.com' + source
    videos = sorted(set(a['href'].split('?')[0] for a in soup.select('a[href]') if 'instagram.com/' in a['href'] and re.search(r'/(reel|p)/', a['href'])))
    if meta.get('videoUrlOverride'):
        videos = [meta['videoUrlOverride']]
    own = meta['excludeAffiliations']
    episode = {'id': slug, 'guest': guest, 'chefOrCook': meta['chefOrCook'],
               'affiliationsExcluded': own, 'articleUrl': source,
               'articleDate': datetime.fromtimestamp(article['publishOn']/1000, timezone.utc).date().isoformat(),
               'videoUrls': videos, 'evidenceType': 'publisher_expanded_list',
               'videoReviewed': False}
    episodes.append(episode)
    has_full_heading = any('full list' in h.get_text().lower() for h in soup.select('h1,h2,h3,h4'))
    active = not has_full_heading
    speaker = guest
    for node in soup.find_all(['h1','h2','h3','h4','li']):
        text = clean(node.get_text(' ', strip=True))
        if node.name != 'li':
            if 'full list' in text.lower():
                active = True
                match = re.search(r'of (.+?)[’\']s Local', text, re.I)
                if match and ('&' in guest or ' and ' in guest):
                    speaker = match.group(1)
            elif text.lower().startswith('watch ') or text.lower() == 'featured':
                active = False
            elif active and text.rstrip(':') in ['Tara', 'Erick']:
                speaker = text.rstrip(':')
            continue
        if node.find_parent('li'):
            continue
        if not active:
            excluded.append({'episodeId': slug, 'reason': 'own-venue menu / outside external favourites section', 'entry': text})
            continue
        if ':' not in text:
            # The publisher omits a colon on this one entry.
            if text.startswith('Quick Bites '):
                category, value = 'Quick Bites', text[len('Quick Bites '):]
            else:
                unresolved.append({'episodeId': slug, 'entry': text, 'reason': 'category/answer split unclear'})
                continue
        else:
            category, value = [s.strip() for s in text.split(':', 1)]
        base = {'episodeId': slug, 'guest': speaker, 'episodeGuest': guest,
                'chefOrCook': meta['chefOrCook'], 'category': category,
                'sourceUrl': source, 'videoUrl': videos[0] if videos else '',
                'evidenceType': 'publisher_expanded_list', 'videoReviewed': False,
                'experience': 'wish_list_not_visited' if 'dying to try' in category.lower() else 'recommendation'}
        links = []
        for a in node.select('a[href]'):
            label = clean(a.get_text(' ', strip=True))
            if label and a['href'].startswith(('http://','https://')):
                links.append({'name': label, 'url': a['href']})
        matches = [o for o in own if norm(o) and norm(o) in norm(value)]
        if matches:
            excluded.append({'episodeId': slug, 'reason': 'own/current workplace or affiliated venue', 'entry': text, 'matchedAffiliations': matches})
            # Retain independently linked outside choices in mixed answers.
            links = [l for l in links if not any(norm(o) in norm(l['name']) or norm(l['name']) in norm(o) for o in own)]
            if links:
                value = '; '.join(l['name'] for l in links)
            else:
                continue
        if not value:
            continue
        # Facts are stored as question/answer pairs, not copied narrative articles.
        # Repair publisher inline-link fragments; factual answer remains unchanged.
        if guest == 'Scott Thornhill' and category == 'Dying to Try':
            links = [{'name':'June','url':'https://juneoncambie.com/'}]
        elif guest == 'Scott Thornhill' and category == 'Bakery':
            links = [{'name':'Nemesis Coffee','url':'https://www.nemesis.coffee/'},{'name':'Dope Bakehouse','url':'http://dopebakehouse.com/'}]
        elif guest == 'Roger Ma' and category == 'Sushi, Mid-Tier':
            links = [{'name':'Sushi Hil','url':'https://www.sushihil.com/'},{'name':'Yagoto Sushi','url':'https://yagotosushi.com/'}]
        elif guest == 'Tushar Tondvalkar' and category == 'Indian':
            links = [{'name':'Hyderabad Biryani House','url':'https://hyderabadbiryanihouse.ca/'},{'name':'Dosa Corner','url':'https://dosacorner.ca/'}]
        rows.append({**base, 'recommendation': value, 'venueLinks': links,
                     'kind': 'named_place_or_business' if links else 'unlinked_answer'})

inventory_count = len(episodes)
# Scope is BC destinations recommended by explicitly identified chefs/cooks.
# Retain the complete episode inventory separately, not non-BC recommendation lists.
(OUT/'episode-inventory.json').write_text(json.dumps(episodes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
outside_guests = {'Bill Osborne', 'Oscar Holgado', 'Jake McWilliams'}
scope_excluded = []
bc_rows = []
for r in rows:
    reason = None
    # Reviewed non-BC exceptions in owner episodes; retain mixed BC choices.
    if (r['episodeGuest']=='Paul Grunberg' and r['category']=='Dying to Try') or (r['episodeGuest']=='Karl Gregg' and r['category']=='Burger') or (r['episodeGuest']=='Owen Coomer' and r['category']=='Brewery'):
        reject=['Bistrot','Leroy','Deschutes','Modern Times','Rodenbach']
        r['venueLinks']=[l for l in r['venueLinks'] if not any(v.lower() in l['name'].lower() for v in reject)]
        r['recommendation']='; '.join(l['name'] for l in r['venueLinks'])
    if any(x in r['category'] for x in ['Mexico','Texas']) or any(x in r['recommendation'] for x in ["Linny's",'Le Vin Papillon','Tetetlán']) or r['category'] in ['Soccer Team','Perfect Side for Brisket']:
        scope_excluded.append({'episodeId':r['episodeId'],'category':r['category'],'reason':'Reviewed owner-episode outside-BC destination or non-place answer'})
        continue
    if not r['chefOrCook'] and not review[r['episodeId']].get('includeOwner'):
        reason = 'Supplementary non-chef guest: outside chef-focused publication scope'
    elif r['episodeGuest'] in outside_guests:
        reason = 'Episode recommendations are outside British Columbia'
    elif any(s in r['recommendation'] for s in ['Crete, Greece', 'Yakiniku Jumbo', 'Hali Deli']):
        reason = 'Destination outside British Columbia'
    elif r['category'] in ['Cuisine','Comfort Food','West Coast Oyster','Jarritos Flavour','Mexican Snack','Drink','Japanese Beer'] or r['recommendation'] == 'Fresh oysters from the beach':
        reason = 'Generic food/drink preference, not a BC destination'
    if reason:
        scope_excluded.append({'episodeId':r['episodeId'],'category':r['category'],'reason':reason})
        continue
    if r['episodeGuest'] == 'Scott Thornhill' and r['category'] == 'Pizza':
        r['recommendation'] = 'AJ’s Brooklyn Pizzeria (Vancouver)'
        r['venueLinks'] = [l for l in r['venueLinks'] if 'ajsbrooklyn' in l['url']]
        scope_excluded.append({'episodeId':r['episodeId'],'category':'Pizza','reason':'Brooklyn choice removed from mixed-location answer'})
    r['region'] = 'British Columbia'
    r['locationEvidence'] = 'Publisher local-favourites context and linked venue; non-BC exceptions removed. Chain branch unspecified unless source names it.'
    bc_rows.append(r)
rows = bc_rows
# Source-reviewed video-only episodes do not require a fabricated blog article.
if (OUT/'video-episodes.json').exists():
    episodes.extend(json.loads((OUT/'video-episodes.json').read_text(encoding='utf-8')))
if (OUT/'video-additions.json').exists():
    for added in json.loads((OUT/'video-additions.json').read_text(encoding='utf-8')):
        ep = next(e for e in episodes if e['id']==added['episodeId'])
        assert not any(norm(o) in norm(added['name']) for o in ep['affiliationsExcluded']), 'Affiliated video pick'
        rows.append({'episodeId':ep['id'],'guest':ep['guest'],'episodeGuest':ep['guest'],'chefOrCook':ep['chefOrCook'],
                     'category':added['category'],'recommendation':added['name'],'sourceUrl':added['source'],
                     'videoUrl':added['source'],'evidenceType':'video_transcript_and_caption_review','videoReviewed':True,
                     'experience':'recommendation','region':'British Columbia','kind':'named_place_or_business',
                     'venueLinks':[{'name':added['name'],'url':added['website']}] if added['website'] else [],
                     'locationEvidence':'BC venue identity checked against video caption and restaurant context',
                     'comment':added['comment'],'startSeconds':added['startSeconds']})
episodes = [e for e in episodes if any(r['episodeId']==e['id'] for r in rows)]
(OUT/'scope-exclusions.json').write_text(json.dumps(scope_excluded,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for ep in episodes:
    ep['recommendationCount'] = sum(r['episodeId']==ep['id'] for r in rows)
for name, data in [('episodes',episodes),('recommendations',rows),('excluded',excluded),('needs-review',unresolved)]:
    (OUT / f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
fields = ['guest','episodeGuest','category','recommendation','experience','chefOrCook','sourceUrl','videoUrl','evidenceType','videoReviewed']
with (OUT/'recommendations.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(rows)

def md(s):
    return str(s).replace('|','\\|').replace('\n',' ')
for filename, chef_only in [('CHEFS.md',True)]:
    lines=['# British Columbia — chefs’ outside recommendations', '',
           '> Partial coverage: official expanded episode lists, not a completed review of every video. Includes off-camera picks. Own/current workplaces and known affiliated venues are excluded. “Dying to try” is a wish list, not a claim of having eaten there.', '']
    for ep in episodes:
        if chef_only and not ep['chefOrCook'] and not review[ep['id']].get('includeOwner'):
            continue
        selected=[r for r in rows if r['episodeId']==ep['id']]
        lines += [f"## {ep['guest']}", '', f"[{'Reviewed video' if ep.get('dateLabel')=='EPISODE VIDEO' else 'Official list'}]({ep['articleUrl']})" + (f" · [Episode]({ep['videoUrls'][0]})" if ep['videoUrls'] else ' · Episode link not found'),
                  'Excluded affiliations: '+(', '.join(ep['affiliationsExcluded']) or 'None identified in publisher biography')+'.', '',
                  '| Recommendation category | Pick | Source |','|---|---|---|']
        for r in selected:
            label=r['category'] + (f" ({r['guest']})" if r['guest']!=ep['guest'] else '')
            evidence = 'Video' if r['videoReviewed'] else 'Expanded list'
            lines.append(f"| {md(label)} | {md(r['recommendation'])} | [{evidence}]({r['sourceUrl']}) |")
        lines.append('')
    (ROOT/filename).write_text('\n'.join(lines)+'\n',encoding='utf-8')
summary={'asOf':'2026-11-17','region':'British Columbia','officialEpisodeArticlesInventoried':inventory_count,'includedEpisodes':len(episodes),'includedEpisodeArticles':sum(e['evidenceType']=='publisher_expanded_list' for e in episodes),'videoOnlyEpisodes':sum(e['evidenceType']!='publisher_expanded_list' for e in episodes),
         'chefOrCookEpisodeArticles':sum(e['chefOrCook'] for e in episodes),
         'recommendationAnswers':len(rows), 'chefOrCookAnswers':sum(r['chefOrCook'] for r in rows),
         'excludedEntries':len(excluded),'unresolvedEntries':len(unresolved),
         'videosReviewed':sum(e.get('videoReviewed',False) for e in episodes),'completeVideoInventory':False}
(OUT/'coverage.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2))
