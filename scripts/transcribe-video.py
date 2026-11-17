"""Local speech-to-text research aid. Output stays in ignored cache for review."""
import json, sys, time
from pathlib import Path
from yt_dlp import YoutubeDL
from faster_whisper import WhisperModel
root=Path(__file__).resolve().parents[1]
out=root/'.cache/video';out.mkdir(exist_ok=True)
url=sys.argv[1]
with YoutubeDL({'format':'bestaudio/best','outtmpl':str(out/'%(id)s.%(ext)s'),'writeinfojson':True,'quiet':True,'noplaylist':True}) as ydl:
    info=ydl.extract_info(url,download=True)
    path=ydl.prepare_filename(info)
print('Downloaded',info['id'],flush=True)
model=WhisperModel('small.en',device='cpu',compute_type='int8',cpu_threads=6)
started=time.time()
segments,meta=model.transcribe(path,beam_size=5,vad_filter=True,language='en')
rows=[]
for s in segments:
    rows.append({'start':round(s.start,2),'end':round(s.end,2),'text':s.text.strip()})
    print(f'{s.start:.1f} {s.text.strip()}',flush=True)
(out/f"{info['id']}.transcript.json").write_text(json.dumps({'url':url,'unreviewedMachineTranscript':True,'segments':rows},ensure_ascii=False,indent=2),encoding='utf-8')
print('Transcription seconds',round(time.time()-started),flush=True)
