"""Prepare sourced chef images, deduplicated places and cached OSM coordinates."""
import json, re, time, urllib.request, urllib.parse, unicodedata, sys
from pathlib import Path
from difflib import SequenceMatcher

ROOT = Path(__file__).resolve().parents[1]
load = lambda p: json.loads((ROOT/p).read_text(encoding='utf-8'))
def norm(s):
    return re.sub('[^a-z0-9]', '', unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
def host(url):
    return urllib.parse.urlparse(url).netloc.lower().removeprefix('www.')
aliases = {
 'yagotosushi.com':'Yagoto Sushi','brixandmortar.ca':'Brix & Mortar','shipyardscoffee.com':'Shipyards Coffee',
 'littlebirddimsum.com':'Little Bird Dim Sum','annalena.ca':'AnnaLena','hyderabadbiryanihouse.ca':'Hyderabad Biryani House',
 'dlchickenshack.ca':'DownLow Chicken Shack','hkbbqmaster.com':'HK BBQ Master',
}
articles={a['urlId']:a for a in load('.cache/articles.json')}
episodes=load('data/episodes.json')
chefs=[]
for e in episodes:
    a=articles[e['id']]
    chefs.append({'id':e['id'],'publishedAt':e['articleDate'],'name':e['guest'],'affiliation':', '.join(e['affiliationsExcluded']),
                  'image':a.get('assetUrl','')+'?format=750w','facePosition':load('data/chef-photo-framing.json').get(e['id'],[36,30]),
                  'location':load('data/interview-locations.json').get(e['id'],{}),'source':e['articleUrl'],'episode':e['videoUrls'][0] if e['videoUrls'] else None})

homes=load('data/chef-locations.json') if (ROOT/'data/chef-locations.json').exists() else {}
for c in chefs: c['home']=homes.get(c['id'],{})

places={}
recommendations=load('data/recommendations.json')
for r in recommendations:
    links=r['venueLinks']
    # Source HTML contains a stray Denny's link around the word Coffee in a
    # Nemesis answer. Keep factual answer rather than propagating that bad link.
    links=[l for l in links if not(host(l['url'])=='dennys.ca' and 'Denny' not in r['recommendation'])]
    if not links:
        links=[{'name':r['recommendation'],'url':''}]
    for l in links:
        name=aliases.get(host(l['url']),l['name'])
        if host(l['url'])=='dennys.ca': name='Denny’s'
        if name in ['Phnom Pehn']: name='Phnom Penh'
        key=norm(name)
        # Name aliases across differing links / branch URLs.
        for canonical, choices in {
          'DownLow Chicken Shack':['DownLow Chicken','DL Chicken Shack'],
          'HK BBQ Master':['Hong Kong BBQ Master'], 'Cafe Medina':['Café Medina'],
          'Sushi Hil':['Sushi Hil'], 'AnnaLena':['Annalena'],
          'Via Tevere Pizzeria':['Via Tevere'], 'AJ’s Brooklyn Pizza':['AJ’s Brooklyn Pizzeria'],
          'Unchai':['Unchai Thai Restaurant'], 'Miradoro':['Miradoro Restaurant'],
          'New Town Bakery':['New Town Bakery & Restaurant'], 'St. Lawrence':['St Lawrence'],
          'Song by Kin Kao':['Song'], 'Belli Pizza':['Belli'],
          'The Keefer Bar':['Keefer Bar'], 'Street Hawker':['Street Hawker'], 'Nemesis Coffee':['Nemesis'],
          'Dante Italian Sandwich':['Dante Sandwich'], 'Straight Brooklyn Pizza':['Straight Outta Brooklyn NYC Pizzeria'],
        }.items():
            if key in [norm(x) for x in [canonical]+choices]: name=canonical; key=norm(canonical)
        p=places.setdefault(key,{'id':key,'name':name,'website':l['url'].split('?')[0], 'mentions':[], 'coordinates':None})
        mention={'chefId':r['episodeId'],'category':r['category'].replace('Neighborhood','Neighbourhood'),'wishList':r['experience']=='wish_list_not_visited','source':r['sourceUrl'],'evidenceType':r['evidenceType']}
        if re.search(r'food neighbou?rhood',r['category'],re.I):
            # Keep context tied to this guest's explicit neighbourhood answer.
            context=[]
            if '(' in r['recommendation']:
                context.append('Their neighbourhood pick: '+r['recommendation']+'.')
            for related in recommendations:
                if related['episodeId']!=r['episodeId'] or related is r: continue
                category=related['category']
                if not re.search(r'neighbou?rhood',category,re.I) or re.search(r'food neighbou?rhood',category,re.I): continue
                area=re.search(r'\(([^)]+)\)',category)
                if area and 'neighb' not in area[1].lower() and area[1].lower() not in r['recommendation'].lower(): continue
                context.append(category.replace('Neighborhood','Neighbourhood')+': '+related['recommendation']+'.')
            mention['neighbourhoodContext']=' '.join(context) if context else 'Named as a favourite food neighbourhood. More detail on why they chose it is not yet available in this guide.'
        if mention not in p['mentions']: p['mentions'].append(mention)

cachepath=ROOT/'.cache/geocodes.json'
cache=json.loads(cachepath.read_text(encoding='utf-8')) if cachepath.exists() else {}
cities={
 'Backcountry Brewing':'Squamish','Two Rivers Meats':'North Vancouver','Mount Arrowsmith Brewing Company':'Parksville',
 'Hop Creek Farms':'Squamish','Hop Creek Brewing':'Squamish','J & L Drive-In':'Port Alberni',
 'Twin Sails Brewing':'Port Moody','Parkside Brewery':'Port Moody','Moody Ales':'Port Moody',
 'The Big Flat Pancake Co.':'Port Coquitlam','Shinobi Sushi':'Maple Ridge','Nonna’s':'Coquitlam','The Patch Brewery':'Maple Ridge',
 'Edokko Nigiri Sushi':'Richmond','Il Posto':'Delta','Thre3 Co Cafe':'Delta','Hủ Tiếu Hồng Phát':'Richmond',
 'Mariner Brewing':'Coquitlam','Rewind Beer Co.':'Port Moody','Mama Said Pizza Co.':'Port Moody','Hightop Pizza':'Port Moody',
 'The Fish Man':'Richmond','HK BBQ Master':'Richmond','Elmo Baking Co.':'Port Moody',"Sunny's Diner":'Kelowna',
 'Baan Lao Fine Thai Cuisine':'Richmond','Grounds & Greens Cafe':'White Rock','Haven':'Langley',"Uli's Restaurant":'White Rock',
 'Phở 777 Vietnamese':'White Rock','The Pony Restaurant':'Pemberton','Wind Cries Mary':'Victoria','Yuan’s Garden':'Richmond',
 'L.A. Chicken':'Richmond','Max Noodle House':'Richmond','Miradoro':'Oliver','Alta Bistro':'Whistler','Single Tree Winery':'Abbotsford',
 'Seaside Pearl Winery':'Abbotsford','Salt Spring Island Cheese Company':'Salt Spring Island','The Copper Coil Still & Grill':'Squamish',
 'Francis Bread':'Salt Spring Island','Cassette':'Salt Spring Island','Mavericks':'Salt Spring Island','South End Sausage':'Salt Spring Island',
 'Café Flora':'Salt Spring Island','True Love Pizza':'Salt Spring Island','Salt Spring Kitchen':'Salt Spring Island','Kutatás Winery':'Salt Spring Island',
 'Shipyards Coffee':'North Vancouver','Angela Pastificio':'North Vancouver',"Hank's *A Restaurant":'Victoria','Jeju':'Tofino','Row Fourteen':'Cawston',
 'Marilena':'Victoria','Douce Diner':'North Vancouver','Memory Corner':'Richmond',
 'Streetcar Brewing':'North Vancouver','Cream Pony':'North Vancouver','Pluvio':'Ucluelet',
}
for i,p in enumerate(places.values()):
    city=cities.get(p['name'],'Vancouver')
    query_name={'Kingyo Izakaya':'Kingyo','Juke Fried Chicken':'Juke','The Greek':'The Greek by Anatoli','Dope Bakehouse':'Dope Bakehouse','Tanaka':'Tanaka Sushi','La Grotta Del Formaggio':'La Grotta del Formaggio'}.get(p['name'],p['name'])
    query=query_name+' '+city
    if query not in cache and '--geocode' in sys.argv:
        try:
            url='https://photon.komoot.io/api/?'+urllib.parse.urlencode({'q':query,'limit':5,'lat':49.28,'lon':-123.12})
            req=urllib.request.Request(url,headers={'User-Agent':'ChefsFavResearch/1.0 (github.com/mrhemsing/chefs-fav)'})
            cache[query]=json.load(urllib.request.urlopen(req,timeout=15))
        except Exception as e:
            cache[query]={'features':[],'error':str(e)}
        cachepath.write_text(json.dumps(cache,ensure_ascii=False),encoding='utf-8')
        time.sleep(1.1)
    candidates=[]
    for f in cache.get(query,{}).get('features',[]):
        a=f['properties']; coords=f['geometry']['coordinates']; n=norm(a.get('name','')); wanted=norm(p['name'])
        score=SequenceMatcher(None,n,wanted).ratio()
        if a.get('countrycode')!='CA' or a.get('state') not in ['British Columbia','BC']: continue
        if not(-139<coords[0]<-114 and 48<coords[1]<61): continue
        if score<.90 and not(len(n)>5 and (n.startswith(wanted) or wanted.startswith(n))): continue
        if a.get('osm_key') not in ['amenity','shop','tourism','craft','leisure']: continue
        if a.get('osm_value') in ['dentist','doctors','jewelry','photo','park','picnic_site','outdoor_seating']: continue
        if any(m['category'].lower() in ['food neighborhood','food neighbourhood','favourite food neighbourhood'] for m in p['mentions']) and not p['website']: continue
        candidates.append((score,f))
    candidates.sort(key=lambda v:v[0],reverse=True)
    if candidates:
        f=candidates[0][1]; a=f['properties']
        p.update({'coordinates':f['geometry']['coordinates'],'city':a.get('city',city),
                  'address':' '.join(x for x in [a.get('housenumber'),a.get('street')] if x),
                  'locationSource':f"https://www.openstreetmap.org/{'node' if a['osm_type']=='N' else 'way' if a['osm_type']=='W' else 'relation'}/{a['osm_id']}",
                  'locationStatus':'OpenStreetMap match; branch not specified by chef', 'matchedName':a.get('name')})
    else:
        p.update({'city':cities.get(p['name'],'British Columbia'),'address':'','locationStatus':'Location pending verification'})
    if i%25==0: print(f'Geocoding {i+1}/{len(places)}',flush=True)

# Source-verified location corrections survive data regeneration.
for place_id, correction in load('data/place-location-overrides.json').items():
    if place_id in places:
        if places[place_id].get('coordinates'):
            places[place_id]['coordinateSource'] = places[place_id]['locationSource']
        places[place_id].update(correction)

(ROOT/'public').mkdir(exist_ok=True)
notes=load('data/video-notes.json') if (ROOT/'data/video-notes.json').exists() else []
for added in load('data/video-additions.json') if (ROOT/'data/video-additions.json').exists() else []:
    if added['comment']:
        notes.append({'chefId':added['episodeId'],'placeId':norm(added['name']),'comment':added['comment'],
                      'startSeconds':added['startSeconds'],'source':added['source'],'type':'summary'})
for p in places.values():
    p['comments']=[n for n in notes if n['placeId']==p['id']]
output={'chefs':chefs,'places':list(places.values()),'coverage':load('data/coverage.json'),
        'spokenReviewEpisodes':len(set(n['chefId'] for n in notes))}
(ROOT/'public/map-data.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
print(f"Prepared {len(chefs)} chefs, {len(places)} places, {sum(bool(p['coordinates']) for p in places.values())} OSM matches",flush=True)
