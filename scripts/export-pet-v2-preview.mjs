/** Export the same runtime artwork into a self-contained, non-networked art demo. */
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync,cpSync } from 'node:fs'
import { resolve,join,dirname } from 'node:path'
import { fileURLToPath,pathToFileURL } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const out=resolve(process.argv[2]||join(root,'artifacts/pet-v2-art'))
const tmpRoot=join(root,'node_modules/.cache');mkdirSync(tmpRoot,{recursive:true});mkdirSync(out,{recursive:true})
const tmp=mkdtempSync(join(tmpRoot,'pet-preview-'))
const species={unicorn:'独角兽',puppy:'小狗',rabbit:'小兔',fox:'九尾狐',chick:'小鸡',bear:'眠眠熊',cloud:'云朵','space-cat':'太空猫'}
const actions={idle:'安静坐着',wave:'挥手',feed:'吃点心',growth:'喂星光',pat:'摸摸头',walk:'走动',sleep:'睡觉',bath:'泡泡澡',spin:'转圈',tidy:'收玩具',signature:'专属动作',celebrate:'升级庆祝'}
const ages={baby:'初识 · 1–2 级',young:'成长 · 3–5 级',adult:'大伙伴 · 6 级以上'}
const clothes=['','dress-pink','dress-sailor','dress-rainbow','dress-leaf','dress-bee']
const names=['不穿装扮','花花裙','星星水手裙','彩虹装','森林小裙','小蜜蜂装']
const gallery={},eggs={},shop={}
const artManifest=JSON.parse(readFileSync(join(root,'public/assets/pets-v2/manifest.json'),'utf8'))
const assets={}
// Store each bitmap once. Markup refers to that asset by its ordinary app path.
for(const entry of Object.values(artManifest.assets)){const rel=entry.path.replace(/^assets\/pets-v2\//,'');assets[rel]=`data:image/webp;base64,${readFileSync(join(root,'public',entry.path)).toString('base64')}`}
const serial=value=>JSON.stringify(value).replaceAll('<','\\u003c')
try{
 await build({root,base:'/bedtime/',configFile:false,plugins:[react()],logLevel:'error',build:{ssr:'scripts/pet-v2-preview-entry.jsx',outDir:tmp,emptyOutDir:true,rollupOptions:{output:{entryFileNames:'art.mjs'}}}})
 const art=await import(pathToFileURL(join(tmp,'art.mjs')).href)
 for(const s of Object.keys(species))for(const a of Object.keys(ages))for(const m of Object.keys(actions))gallery[`${s}/${a}/${m}`]=art.actorMarkup({species:s,size:a,motion:m,pose:m==='sleep'?'sleep':'wave'})
 for(const s of Object.keys(species))for(const dress of clothes)gallery[`${s}/outfit/${dress}`]=art.actorMarkup({species:s,size:'young',dress})
 for(const s of Object.keys(species))eggs[s]=art.eggMarkup({species:s})
 const propNames={'house-strawberry':'草莓小屋','house-cloud':'云朵小屋','house-moon':'月亮小屋','house-tree':'树洞小屋','house-star':'星星帐篷','furniture-bed':'小床','furniture-lamp':'小灯','furniture-rug':'小地毯','furniture-shelf':'书架','furniture-cushion':'软垫','furniture-chest':'玩具箱'}
 for(const p of Object.keys(propNames))shop[p]=art.propMarkup({kind:p})
 const css=['pet-creature.css','pet-plush.css'].map(file=>readFileSync(join(root,'src/ui/pets',file),'utf8')).join('\n')
 const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>电子宠物 2.0 · 素材与动作预览</title><style>
*{box-sizing:border-box}body{margin:0;padding:30px 20px;background:#f8f2e9;color:#425446;font-family:system-ui,-apple-system,sans-serif}main{max-width:1120px;margin:auto}h1{font-size:30px;margin:12px 0}p{line-height:1.8;color:#68756b}button,select{font:inherit;color:inherit}button{cursor:pointer}.eyebrow{font-size:12px;letter-spacing:2px;color:#8b756b}.layout{display:grid;grid-template-columns:1.25fr 1fr;gap:22px;margin:25px 0}.stage{position:relative;min-height:440px;display:grid;place-items:center;border-radius:32px;border:1px solid #d7dfcf;background:radial-gradient(ellipse at 50% 80%,#f7ebce 0 25%,transparent 26%),linear-gradient(135deg,#dce8e0,#f6eddf)}.stage>.pet-actor{width:310px;height:330px;display:block}.stage>.pet-egg{height:300px;width:300px}.panel{border:1px solid #e3daca;background:#fffdf7;border-radius:26px;padding:24px}label{display:block;margin:0 0 16px;font-size:14px;font-weight:600}select{display:block;width:100%;padding:12px;border:1px solid #cfdaca;border-radius:12px;background:#fffdf8;margin-top:6px;min-height:44px}.buttons{display:flex;gap:9px;flex-wrap:wrap}.buttons button,.preview-item{padding:11px 15px;border:1px solid #bccbbd;border-radius:12px;background:#edf3e7;min-height:44px}.buttons button:first-child{background:#557760;color:white;border-color:#557760}.eggs{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px;margin:22px 0}.egg{border:1px solid #dfdacb;background:#fffaf1;border-radius:18px;text-align:center;padding:8px;min-width:0}.egg[aria-pressed=true]{outline:2px solid #96b295;background:#eaf2e1}.egg .pet-egg{height:110px;width:100%}.egg span{display:block;font-size:12px}.props{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.props article{background:#fffaf2;border:1px solid #e0d6c6;border-radius:18px;text-align:center;padding:12px}.props svg{width:100%;height:110px}.props p{font-size:12px;margin:5px 0}.note{font-size:13px;padding:16px;border-left:3px solid #d5bd92;background:#fff8e8;border-radius:0 12px 12px 0}.reduce-motion *{animation:none!important;transition:none!important}.reduce-motion .plush-signature,.reduce-motion .plush-love{display:none}button:focus-visible,select:focus-visible{outline:3px solid #49735b;outline-offset:3px}footer{font-size:12px;color:#7b8176;margin-top:24px;padding-top:16px;border-top:1px solid #dbd8c7}@media(max-width:720px){body{padding:20px 13px}.layout{grid-template-columns:1fr}.stage{min-height:340px}.stage>.pet-actor{width:260px;height:280px}.eggs{grid-template-columns:repeat(4,minmax(0,1fr))}.props{grid-template-columns:repeat(3,minmax(0,1fr))}h1{font-size:25px}}${css}
</style></head><body><main><header><span class="eyebrow">GROWING SQUAD · ART PREVIEW</span><h1>自己选一颗蛋，用星光陪它长大</h1><p>这是与代码同源的素材和有限动作预览。可离线打开，不读写家庭数据；不是完整业务应用，也不是实际浏览器验收截图。</p></header><div class="eggs" id="eggs"></div><div class="layout"><div class="stage" id="stage"></div><section class="panel"><label>伙伴<select id="species"></select></label><label>成长外观<select id="age"></select></label><label>动作<select id="action"></select></label><label>试穿装扮<select id="dress"></select></label><div class="buttons"><button type="button" id="replay">重看这个动作</button><button type="button" id="egg">看看它的蛋</button><button type="button" id="reduce">减少动态：关闭</button></div><p class="note">新五种伙伴采用生图姿态与分层衣饰，成长时出现新装饰；原有三种保留分层矢量动作。不把静态姿态表称为连续逐帧影片。</p></section></div><h2>升级后的徽章小铺</h2><p>每升一级 +15 枚徽章；普通裙子 1 枚，小房子 2 枚。这里仅展示图像，不扣任何星光或徽章。</p><div class="props" id="props"></div><footer>图像由本次对话生成，独立裁切为53份 WebP，原图、裁切范围和校验值在源码 design/pets-v2 与 public/assets/pets-v2/manifest.json 中。原有 Motion mini 按 MIT 许可证复用；此独立素材页使用同源 CSS 有限动作，不需要联网加载库。</footer></main><script>
const gallery=${serial(gallery)},eggs=${serial(eggs)},assets=${serial(assets)},shop=${serial(shop)},species=${serial(species)},ages=${serial(ages)},actions=${serial(actions)},clothes=${serial(clothes)},names=${serial(names)},propNames=${serial(propNames)};
const byId=id=>document.getElementById(id);function resolveArt(markup){return markup.replace(/(?:\\/bedtime)?\\/assets\\/pets-v2\\/([^"<> ]+)/g,(_,p)=>assets[p]||'')}
function populate(id,options){for(const [value,text]of Object.entries(options)){const o=document.createElement('option');o.value=value;o.textContent=text;byId(id).append(o)}}
populate('species',species);populate('age',ages);populate('action',actions);populate('dress',Object.fromEntries(clothes.map((c,i)=>[c,names[i]])));
function paint(){const s=byId('species').value,d=byId('dress').value,a=byId('age').value,m=byId('action').value;byId('stage').innerHTML=resolveArt(gallery[d?s+'/outfit/'+d:s+'/'+a+'/'+m]);document.querySelectorAll('.egg').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.species===s)))}
for(const [id,name]of Object.entries(species)){const b=document.createElement('button');b.type='button';b.className='egg';b.dataset.species=id;b.setAttribute('aria-label','预览'+name);b.innerHTML=resolveArt(eggs[id])+'<span>'+name+'</span>';b.onclick=()=>{byId('species').value=id;paint()};byId('eggs').append(b)}
for(const [key,markup]of Object.entries(shop)){const article=document.createElement('article');article.innerHTML=resolveArt(markup)+'<p>'+propNames[key]+'</p>';byId('props').append(article)}
document.querySelectorAll('select').forEach(e=>e.addEventListener('change',paint));byId('replay').onclick=paint;byId('egg').onclick=()=>{byId('stage').innerHTML=resolveArt(eggs[byId('species').value])};byId('reduce').onclick=()=>{const reduced=document.documentElement.classList.toggle('reduce-motion');byId('reduce').textContent='减少动态：'+(reduced?'开启':'关闭')};paint();
</script></body></html>`
 writeFileSync(join(out,'preview.html'),html)
 cpSync(join(root,'public/assets/pets-v2'),join(out,'assets'),{recursive:true})
 writeFileSync(join(out,'README.md'),'# 电子宠物2.0素材预览\n\npreview.html自包含全部图片，可以离线打开；它不连接家庭账户、不实现业务账本、不替代真实浏览器验收。assets目录含53份应用同源WebP及来源清单。五种生图角色采用姿态切换/分层服饰/CSS有限动作，三种原有角色采用分层矢量动作。并非连续逐帧视频；成长模样使用装饰变化及原角色比例变化。\n')
 console.log(`Exported ${Object.keys(gallery).length} actor combinations, 8 eggs, 53 individual assets and offline preview to ${out}`)
}finally{rmSync(tmp,{recursive:true,force:true})}
