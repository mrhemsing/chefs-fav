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
    assert row['chefOrCook'] and not row['videoReviewed']
    assert row['evidenceType'] == 'publisher_expanded_list'
    assert row['sourceUrl'].startswith('https://chefsfav.com/blog/')
    assert row['recommendation']
    assert not any(x in row['recommendation'] for x in ['(Tokyo)', '(Halifax)', '(Brooklyn)', 'Crete, Greece', 'Sandwich:'])
assert any(r['category']=='Sandwich' and r['guest']=='Quynh Anh Pham' for r in rows)
assert not any(r['episodeGuest'] in ['Bill Osborne','Oscar Holgado','Jake McWilliams'] for r in rows)
print(f'PASS: {len(rows)} entries, {len(episodes)} episodes; source, scope and extraction checks.')
