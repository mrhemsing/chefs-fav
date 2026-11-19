"""Apply reviewed venue aliases, retaining all unique recommendations and notes."""
import copy, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def merge_places(places):
    rows=json.loads((ROOT/'data/place-aliases.json').read_text(encoding='utf-8'))
    by_id={p['id']:copy.deepcopy(p) for p in places}
    aliases={r['alias']:r['canonical'] for r in rows}
    for alias,target in aliases.items():
        if alias not in by_id: continue
        assert target in by_id, target
        source=by_id.pop(alias); dest=by_id[target]
        for field in ['mentions','comments']:
            for item in source.get(field,[]):
                item=copy.deepcopy(item)
                if field=='comments': item['placeId']=target
                if item not in dest.setdefault(field,[]): dest[field].append(item)
    return list(by_id.values()),aliases
if __name__=='__main__':
    p=ROOT/'public/map-data.json'
    data=json.loads(p.read_text(encoding='utf-8'))
    before=len(data['places'])
    data['places'],data['placeAliases']=merge_places(data['places'])
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Merged {before} -> {len(data["places"])} places')
