"""Create private contact sheets of actual video frames for source verification."""
import json,sys,av
from pathlib import Path
from PIL import Image,ImageDraw
from yt_dlp import YoutubeDL
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.cache/video';vid=sys.argv[1]
times=[float(t) for t in sys.argv[2:]]
with YoutubeDL({'format':'worst[ext=mp4]','outtmpl':str(OUT/'%(id)s-review.%(ext)s'),'quiet':True,'noprogress':True,'noplaylist':True}) as y:
    info=y.extract_info(f'https://www.instagram.com/reel/{vid}/',download=True);path=y.prepare_filename(info)
container=av.open(path);stream=container.streams.video[0]
sheet=Image.new('RGB',(320*4,590*((len(times)+3)//4)),'#fff');draw=ImageDraw.Draw(sheet)
for i,t in enumerate(times):
    container.seek(int(t/stream.time_base),stream=stream,backward=True)
    for frame in container.decode(stream):
        if frame.time>=t:
            im=frame.to_image();im.thumbnail((320,565));x=(i%4)*320;y=(i//4)*590
            sheet.paste(im,(x,y));draw.text((x+5,y+570),f'{t}s',fill='black');break
sheet.save(OUT/f'{vid}-frames.jpg')
print(OUT/f'{vid}-frames.jpg')
