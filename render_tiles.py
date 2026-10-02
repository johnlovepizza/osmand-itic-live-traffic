import os
from PIL import Image, ImageDraw
z,x,y=12,3383,1639
os.makedirs(f'public/{z}/{x}', exist_ok=True)
img=Image.new('RGBA',(256,256),(0,0,0,0))
ImageDraw.Draw(img).rectangle((8,8,248,248), outline=(255,0,0,255), width=4)
img.save(f'public/{z}/{x}/{y}.png')
