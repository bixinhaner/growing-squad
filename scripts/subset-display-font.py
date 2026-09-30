"""Build the child display font subset from the characters the UI actually uses.

Usage: python3 scripts/subset-display-font.py   (needs: pip install fonttools brotli)
The full ZCOOL KuaiLe font ships as ~190 unicode-range shards in @fontsource;
we subset each shard to the UI glyphs and merge them into one small woff2 so the
offline precache stays tiny.
"""
import glob, io, os, re
from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
text = ''
for path in glob.glob(os.path.join(ROOT, 'src', '**', '*.js*'), recursive=True):
    if '.test.' in path:
        continue
    text += open(path, encoding='utf-8').read()
chars = set(re.findall(r'[　-〿一-鿿＀-￯]', text))
chars |= set('0123456789：，。！？、·…～')
shards = sorted(glob.glob(os.path.join(ROOT, 'node_modules/@fontsource/zcool-kuaile/files/zcool-kuaile-*-400-normal.woff2')))
parts = []
for shard in shards:
    font = TTFont(shard)
    cmap = font.getBestCmap()
    wanted = [c for c in chars if ord(c) in cmap]
    if not wanted:
        continue
    options = subset.Options()
    options.flavor = None
    options.layout_features = ['*']
    sub = subset.Subsetter(options)
    sub.populate(text=''.join(wanted))
    sub.subset(font)
    out = os.path.join('/tmp', f'squad-part-{len(parts)}.ttf')
    font.flavor = None
    font.save(out)
    parts.append(out)
merged = Merger().merge(parts)
merged.flavor = 'woff2'
target = os.path.join(ROOT, 'src', 'v4', 'fonts', 'zcool-kuaile-squad.woff2')
merged.save(target)
print(f'{len(chars)} characters from {len(parts)} shards -> {os.path.getsize(target) // 1024} KB')
