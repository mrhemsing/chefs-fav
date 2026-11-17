"""Cache ASR for the known chef episodes; every output requires editorial review."""
import json,time
from pathlib import Path
from yt_dlp import YoutubeDL
from faster_whisper import WhisperModel
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.cache/video';OUT.mkdir(exist_ok=True)
eps=json.loads((ROOT/'data/episodes.json').read_text(encoding='utf-8'))
model=WhisperModel('small.en',device='cpu',compute_type='int8',cpu_threads=6)
for index,ep in enumerate(eps):
    if not ep['videoUrls']:continue
    url=ep['videoUrls'][0];vid=url.rstrip('/').split('/')[-1]
    target=OUT/f'{vid}.transcript.json'
    if target.exists():print(f"{index+1}/{len(eps)} cached {ep['guest']}",flush=True);continue
    try:
        with YoutubeDL({'format':'bestaudio/best','outtmpl':str(OUT/'%(id)s.%(ext)s'),'writeinfojson':True,'quiet':True,'noprogress':True,'noplaylist':True,'socket_timeout':20,'retries':1}) as y:
            info=y.extract_info(url,download=True);path=y.prepare_filename(info)
        segments,meta=model.transcribe(path,beam_size=5,vad_filter=True,language='en')
        rows=[{'start':round(s.start,2),'end':round(s.end,2),'text':s.text.strip()} for s in segments]
        target.write_text(json.dumps({'url':url,'guest':ep['guest'],'unreviewedMachineTranscript':True,'segments':rows},ensure_ascii=False,indent=2),encoding='utf-8')
        print(f"{index+1}/{len(eps)} transcribed {ep['guest']}",flush=True)
    except Exception as e:print(f"{index+1}/{len(eps)} FAILED {ep['guest']}: {str(e)[:150]}",flush=True)
