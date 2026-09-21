from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
import json,hashlib,argparse
import numpy as np
from scipy import ndimage
parser=argparse.ArgumentParser(description='Rebuild the reviewed pet image cutouts. Requires Pillow, NumPy and SciPy.')
parser.add_argument('--source-dir',default='design/pets-v2/source')
parser.add_argument('--out',default='public/assets/pets-v2')
parser.add_argument('--review',default='artifacts/pets-v2/crop-review.png')
args=parser.parse_args()
source_dir=Path(args.source_dir);root=Path(args.out);root.mkdir(parents=True,exist_ok=True)
manifest={'source':'Images generated in this conversation, processed into individual runtime assets. Not continuous frame-by-frame animation.','sources':{},'assets':{}}
def cut(source,name,box,size=384):
 im=Image.open(source_dir/source).convert('RGBA').crop(box)
 a=np.array(im.getchannel('A'))
 # Remove disconnected neighbors at sheet-cell edges, preserve the core silhouette.
 labels,count=ndimage.label(a>45,structure=np.ones((3,3)))
 if count:
  sizes=np.bincount(labels.ravel());sizes[0]=0;main=int(sizes.argmax())
  keep=ndimage.binary_dilation(labels==main,iterations=3)
  a=np.where(keep,a,0).astype('uint8');im.putalpha(Image.fromarray(a))
 alpha=im.getchannel('A'); bbox=alpha.point(lambda x:255 if x>40 else 0).getbbox()
 if bbox:im=im.crop(bbox)
 # Normalize all poses to the same content box; thumbnail() alone would not
 # enlarge small sheet cells, making the pet shrink when it changes expression.
 scale=min((size-20)/im.width,(size-20)/im.height)
 im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(size,size));canvas.alpha_composite(im,((size-im.width)//2,size-10-im.height))
 path=root/(name+'.webp');path.parent.mkdir(parents=True,exist_ok=True);canvas.save(path,'WEBP',quality=93,method=3)
 manifest['assets'][name]={'path':'assets/pets-v2/'+name+'.webp','crop':box,'size':[size,size],'source':source,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
for name,gen in [('kawaii_pastel_plush_pet_collection.png','ded60566-6f76-48c4-ac3f-834309a3f558'),('pastel_plush_animal_sprite_grid.png','51fcc3ff-3836-4de4-aa76-f3d50eb4740a'),('kawaii_plush_pet_shop_sticker_sheet.png','1859dd47-544a-406c-8acc-258d1232e37a')]:
 manifest['sources'][name]={'generationId':gen,'sha256':hashlib.sha256((source_dir/name).read_bytes()).hexdigest(),'dimensions':Image.open(source_dir/name).size}
# Each row follows the actual generated layout, not an assumed uniform grid.
ys=[0,253,467,674,884,1086];xs=[0,249,494,735,975,1210,1448]
for r,species in enumerate(['unicorn','puppy','rabbit','fox','chick']):
 for c,pose in enumerate(['idle','happy','eating','wave','sleep','skill']):
  cut('pastel_plush_animal_sprite_grid.png',f'pets/{species}/{pose}',[xs[c],ys[r],xs[c+1],ys[r+1]])
boxes={'unicorn':[62,0,407,412],'puppy':[708,32,1120,409],'rabbit':[0,434,404,784],'fox':[710,417,1150,795],'chick':[259,787,567,1080]}
for name,box in boxes.items():cut('kawaii_pastel_plush_pet_collection.png',f'pets/{name}/idle',box,512)
for name,box in {'unicorn':[410,62,699,416],'puppy':[1120,61,1448,423],'rabbit':[411,454,702,795],'fox':[1150,451,1448,799],'chick':[565,787,813,1086]}.items():cut('kawaii_pastel_plush_pet_collection.png','eggs/'+name,box,384)
cut('kawaii_pastel_plush_pet_collection.png','badge',[877,822,1116,1067],192)
cut('kawaii_pastel_plush_pet_collection.png','star',[1133,806,1384,1057],192)
xs=[0,287,577,868,1160,1448]
for i,name in enumerate(['pink','sailor','rainbow','leaf','bee']):cut('kawaii_plush_pet_shop_sticker_sheet.png','shop/dress-'+name,[xs[i],198,xs[i+1],470])
for i,name in enumerate(['strawberry','cloud','moon','tree','star']):cut('kawaii_plush_pet_shop_sticker_sheet.png','shop/house-'+name,[xs[i],472,xs[i+1],756])
for name,box in {'bed':[0,755,258,958],'lamp':[258,744,428,963],'rug':[428,763,732,964],'shelf':[732,750,940,970],'cushion':[940,783,1210,962],'chest':[1205,756,1448,966]}.items():cut('kawaii_plush_pet_shop_sticker_sheet.png','shop/furniture-'+name,box)
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
# Contact sheet for actual crop QA only, never part of the app.
paths=list(root.glob('pets/*/idle.webp'))+list(root.glob('eggs/*'))+list(root.glob('shop/*'))
w=800;h=((len(paths)+5)//6)*145
board=Image.new('RGB',(w,h),'#fbf3e5');d=ImageDraw.Draw(board)
for i,p in enumerate(paths):
 im=Image.open(p);im.thumbnail((122,120));x=(i%6)*133;y=(i//6)*145;board.paste(im,(x,y),im);d.text((x+2,y+122),p.stem[:19],fill='#484234')
Path(args.review).parent.mkdir(parents=True,exist_ok=True)
board.save(args.review)
print('Assets',len(manifest['assets']),'bytes',sum(p.stat().st_size for p in root.rglob('*.webp')))
