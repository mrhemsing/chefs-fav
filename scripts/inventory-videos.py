"""Cache public reel metadata for editorial classification; no credentials stored."""
import concurrent.futures,json,time
from pathlib import Path
from yt_dlp import YoutubeDL
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.cache/video';OUT.mkdir(exist_ok=True)
reels=json.loads((ROOT/'data/reel-inventory.json').read_text(encoding='utf-8'))['reels']
class Quiet:
    def debug(self,msg):pass
    def warning(self,msg):pass
    def error(self,msg):pass
def fetch(r):
    p=OUT/f"{r['id']}.info.json"
    if p.exists():return r['id'],'cached'
    try:
        with YoutubeDL({'quiet':True,'no_warnings':True,'logger':Quiet(),'skip_download':True,'noplaylist':True,'socket_timeout':20,'retries':1,'extractor_retries':1}) as y:
            d=y.extract_info(r['url'],download=False)
            p.write_text(json.dumps(y.sanitize_info(d),ensure_ascii=False),encoding='utf-8')
        time.sleep(1.5)
        return r['id'],'ok'
    except Exception as e:
        return r['id'],str(e)[:200]
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for i,result in enumerate(pool.map(fetch,reels)):
        results.append(result)
        (ROOT/'.cache/video-metadata-status.json').write_text(json.dumps(results),encoding='utf-8')
        if i%10==0 or result[1] not in ['ok','cached']:print(f'{i+1}/{len(reels)} {result}',flush=True)
        if 'rate' in result[1].lower() or 'login required' in result[1].lower():
            print('Access limit encountered; stopping metadata fetch.',flush=True)
            pool.shutdown(wait=False,cancel_futures=True)
            break
print('Metadata pass ended',len(results),flush=True)
