"""Check publication invariants, not completeness of video or venue research."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
read = lambda name: json.loads((root/'data'/f'{name}.json').read_text(encoding='utf-8'))
rows, episodes, coverage = read('recommendations'), read('episodes'), read('coverage')
ids = {e['id'] for e in episodes}
assert len(ids) == len(episodes)
assert coverage['recommendationAnswers'] == len(rows)
assert coverage['includedEpisodeArticles'] == len(episodes)
assert not read('needs-review')
for row in rows:
    assert row['episodeId'] in ids
    assert row['region'] == 'British Columbia'
    assert row['chefOrCook'] or read('editorial-review')[row['episodeId']].get('includeOwner')
    if row['evidenceType'] == 'publisher_expanded_list':
        assert not row['videoReviewed']
        assert row['sourceUrl'].startswith('https://chefsfav.com/blog/')
    else:
        assert row['evidenceType'] == 'video_transcript_and_caption_review'
        assert row['videoReviewed'] and row['sourceUrl'].startswith('https://www.instagram.com/reel/')
    assert row['recommendation']
    assert not any(x in row['recommendation'] for x in ['(Tokyo)', '(Halifax)', '(Brooklyn)', 'Crete, Greece', 'Sandwich:'])
assert any(r['category']=='Sandwich' and r['guest']=='Quynh Anh Pham' for r in rows)
assert not any(r['episodeGuest'] in ['Bill Osborne','Oscar Holgado','Jake McWilliams'] for r in rows)
print(f'PASS: {len(rows)} entries, {len(episodes)} episodes; source, scope and extraction checks.')
if (root/'public/map-data.json').exists():
    app=json.loads((root/'public/map-data.json').read_text(encoding='utf-8'))
    chefs={c['id'] for c in app['chefs']}
    placeids={p['id'] for p in app['places']}
    assert len(placeids)==len(app['places'])
    for p in app['places']:
        for m in p['mentions']: assert m['chefId'] in chefs
        for n in p.get('comments',[]):
            assert n['chefId'] in chefs and n['startSeconds']>=0 and n['type']=='summary'
        if p['coordinates']:
            lon,lat=p['coordinates'];assert -139<lon<-114 and 48<lat<61
            assert p.get('coordinateSource',p['locationSource']).startswith('https://www.openstreetmap.org/')
        assert p['city'].strip() and p['city'] not in ['British Columbia', 'BC', 'Vancouver'], p['id']
        assert p.get('locationSource','').startswith(('https://','http://')), p['id']
        assert p['city'] == read('place-location-overrides')[p['id']]['city']
    for alias,target in app.get('placeAliases',{}).items():
        assert alias not in placeids and target in placeids
    for c in app['chefs']:
        assert c['location'].get('city')
        assert c['location']['city'] != 'Vancouver' or c['location'].get('neighbourhood')
    for n in read('video-notes'):
        assert n['chefId'] in chefs and app.get('placeAliases',{}).get(n['placeId'],n['placeId']) in placeids
    print(f"PASS: {len(app['places'])} app places; chef, note and coordinate integrity.")
