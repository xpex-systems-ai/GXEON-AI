import os, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont
W,H,FPS,DUR=720,720,24,18
videos=[
("01-proof-antiquity","PROOF OF ANTIQUITY",["RustChain explores a different mining idea.","Hardware identity and history can matter.","Useful participation over raw GPU power."],"GXEON AI • RUSTCHAIN"),
("02-vintage-hardware","VINTAGE HARDWARE",["Old computers are not automatically obsolete.","Attested hardware can become network infrastructure.","Vintage hardware. New utility."],"GXEON AI • NEW UTILITY"),
("03-agent-economy","AI AGENT ECONOMY",["SCAN open bounties.","VERIFY requirements.","EXECUTE work and submit proof.","TRACK the reward."],"GXEON AI • AGENT ECONOMY"),
("04-bounty-lifecycle","RTC BOUNTY LIFECYCLE",["OPEN → REQUIREMENTS","SUBMIT → MAINTAINER REVIEW","LEDGER → WALLET","Verify every step."],"GXEON AI • VERIFY EVERY STEP"),
("05-gxeon-showcase","GXEON AI",["SCAN GitHub bounties.","CHECK rules and evidence.","TRACK RTC wallet state.","PREPARE verifiable submissions."],"SCAN • VERIFY • EXECUTE")
]
os.makedirs("dist",exist_ok=True); os.makedirs("frames",exist_ok=True)
font="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
reg="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
def f(path,size,bold=False): return ImageFont.truetype(font if bold else reg,size)
for slug,title,lines,end in videos:
    d=f"frames/{slug}"; os.makedirs(d,exist_ok=True)
    total=FPS*DUR
    for n in range(total):
        t=n/FPS; im=Image.new("RGB",(W,H),(6,12,25)); dr=ImageDraw.Draw(im)
        for y in range(0,H,48): dr.line((0,y,W,y),fill=(12,34,58),width=1)
        for x in range(0,W,48): dr.line((x,0,x,H),fill=(12,34,58),width=1)
        dr.rounded_rectangle((36,34,684,686),28,outline=(0,212,255),width=2)
        dr.text((60,62),"GXEON // VIDEO FACTORY",font=f("",20,True),fill=(0,212,255))
        dr.text((60,130),title,font=f("",42,True),fill="white")
        idx=min(int(t//4),len(lines)-1)
        y=270
        for i,line in enumerate(lines):
            fill=(255,122,0) if i==idx else (135,150,170)
            wrapped=textwrap.wrap(line,28)
            for q in wrapped:
                dr.text((60,y),q,font=f("",30,i==idx),fill=fill); y+=42
            y+=18
        dr.text((60,620),end,font=f("",20,True),fill="white")
        im.save(f"{d}/{n:04d}.jpg",quality=82)
    out=f"dist/{slug}.mp4"
    subprocess.run(["ffmpeg","-y","-loglevel","error","-framerate",str(FPS),"-i",f"{d}/%04d.jpg","-vf","format=yuv420p","-c:v","libx264","-preset","veryfast","-crf","32","-movflags","+faststart",out],check=True)
    print(out)
