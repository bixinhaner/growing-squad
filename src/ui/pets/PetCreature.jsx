import { useId } from 'react'
import './pet-creature.css'

const PALETTES = { bear:['#efc48b','#ca945c','#754e36'], rabbit:['#fff6eb','#e8d7ce','#936c6a'], cloud:['#fffef8','#c9dce7','#536d7e'], 'space-cat':['#c8c5cf','#9694a5','#57556a'] }
const star = 'M0-13 4-4 14-3 7 4 9 14 0 9-9 14-7 4-14-3-4-4Z'

/** Articulated artwork. Different ages have different proportions, not just CSS scale. */
export function PetCreature({ species='bear', age='baby', action='idle', asleep=false, dress='', skill=3, dirt=0, className='' }) {
  const id=useId().replaceAll(':','')
  const colors=PALETTES[species] || PALETTES.bear
  const baby=age==='baby', adult=age==='adult' || age==='companion'
  const headR=baby?61:adult?49:55, headY=species==='cloud'?130:baby?113:adult?87:101
  const bodyY=species==='cloud'?191:baby?183:adult?170:179, bodyH=species==='cloud'?(adult?35:27):baby?46:adult?64:54
  const bodyW=baby?42:adult?48:46
  const sleeping=asleep || action==='sleep' || action==='rest'
  const eating=['feed','water'].includes(action)
  const happy=['celebrate','hop','play','pat','cuddle','offer','catch'].includes(action)
  const fur=`url(#${id}-fur)`, soft=`url(#${id}-soft)`
  const moonRabbit=species==='rabbit', cat=species==='space-cat', cloud=species==='cloud'
  return <svg viewBox="0 0 280 285" className={`pet-rig pet-rig--${action} pet-rig--${species} ${className}`} data-age={age} data-skill={skill} data-action={action} aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${id}-fur`} cx="32%" cy="24%" r="85%"><stop stopColor={colors[0]} /><stop offset=".72" stopColor={colors[0]} /><stop offset="1" stopColor={colors[1]} /></radialGradient>
      <radialGradient id={`${id}-soft`} cx="35%" cy="25%" r="80%"><stop stopColor="#fffdf1" /><stop offset="1" stopColor={cloud?'#dae8f0':'#f6dfbe'} /></radialGradient>
      <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a6bae6" /><stop offset="1" stopColor="#687fae" /></linearGradient>
      <filter id={`${id}-felt`} x="-12%" y="-12%" width="124%" height="124%"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="2" seed="6" result="n" /><feColorMatrix in="n" type="saturate" values="0" /><feComponentTransfer><feFuncA type="linear" slope=".12" /></feComponentTransfer><feComposite in2="SourceGraphic" operator="in" /><feBlend in="SourceGraphic" mode="soft-light" /></filter>
    </defs>
    <ellipse cx="140" cy="262" rx={cloud?66:72} ry="10" fill="#443e4f" opacity=".12" className="rig-shadow" />
    <g className="rig-whole">
      {cat && <path className="rig-tail" d="M178 197Q243 245 231 197Q226 181 210 191" fill="none" stroke={colors[1]} strokeWidth="20" strokeLinecap="round" />}
      {!cloud && <>
        <g className="rig-leg rig-leg--left"><ellipse cx="110" cy="237" rx={baby?25:22} ry={baby?18:23} fill={fur} stroke={colors[1]} strokeWidth="1" /><ellipse cx="111" cy="242" rx="14" ry="9" fill={cat?'#6c83a4':'#f7ddbd'} opacity=".7" /></g>
        <g className="rig-leg rig-leg--right"><ellipse cx="170" cy="237" rx={baby?25:22} ry={baby?18:23} fill={fur} stroke={colors[1]} strokeWidth="1" /><ellipse cx="169" cy="242" rx="14" ry="9" fill={cat?'#6c83a4':'#f7ddbd'} opacity=".7" /></g>
      </>}
      <g className="rig-body"><ellipse cx="140" cy={bodyY} rx={bodyW} ry={bodyH} fill={cat?'#e9eff5':fur} filter={`url(#${id}-felt)`} /><ellipse cx="140" cy={bodyY+7} rx={bodyW*.65} ry={bodyH*.69} fill={soft} opacity=".8" />
        {dirt>0 && <g className="rig-mud" opacity=".58"><ellipse cx="127" cy={bodyY+15} rx="8" ry="5" fill="#a47f5c" /><ellipse cx="155" cy={bodyY+26} rx="6" ry="8" fill="#a47f5c" /></g>}
        {cat && <path d={star} transform={`translate(140 ${bodyY+8}) scale(.64)`} fill="#efd078" />}
        {dress==='raincoat' && <path d={`M${140-bodyW+3} ${bodyY-26}Q140 ${bodyY-3} ${140+bodyW-3} ${bodyY-26}L186 225Q140 239 94 225Z`} fill="#efc563" stroke="#dcad51" strokeWidth="2" />}
      </g>
      {dress.startsWith('dress-')&&<g className="rig-badge-dress"><path d={`M106 ${bodyY-26}Q140 ${bodyY-15} 174 ${bodyY-26}L183 232Q140 255 97 232Z`} fill={({ 'dress-pink':'#edb2c8','dress-sailor':'#8eaada','dress-rainbow':'#c5b4de','dress-leaf':'#a2bb89','dress-bee':'#ecc267'})[dress]} stroke="#fff0d7" strokeWidth="3"/><path d={`M111 ${bodyY-24}L140 ${bodyY-6}L169 ${bodyY-24}`} fill="none" stroke="#fff5dd" strokeWidth="6"/><path d={star} transform={`translate(140 ${bodyY}) scale(.5)`} fill="#efd16f"/></g>}
      <g className="rig-arm rig-arm--left"><ellipse cx="92" cy={bodyY-3} rx={cloud?21:17} ry={baby?26:33} transform={`rotate(22 92 ${bodyY-3})`} fill={dress==='raincoat'?'#efc563':cat?'#b1c4dc':fur} filter={`url(#${id}-felt)`} /><ellipse cx="83" cy={bodyY+13} rx="7" ry="9" fill={moonRabbit?'#efbac8':'#f6d7ba'} opacity={cloud?0:.65} /></g>
      <g className="rig-arm rig-arm--right"><ellipse cx="188" cy={bodyY-3} rx={cloud?21:17} ry={baby?26:33} transform={`rotate(-22 188 ${bodyY-3})`} fill={dress==='raincoat'?'#efc563':cat?'#b1c4dc':fur} filter={`url(#${id}-felt)`} /><ellipse cx="197" cy={bodyY+13} rx="7" ry="9" fill={moonRabbit?'#efbac8':'#f6d7ba'} opacity={cloud?0:.65} /></g>
      <g className="rig-head">
        {moonRabbit ? <><g className="rig-ear rig-ear--left"><ellipse cx="103" cy={headY-headR+(baby?5:12)} rx={baby?19:17} ry={baby?35:43} transform={`rotate(-15 103 ${headY-headR+(baby?5:12)})`} fill={fur} /><ellipse cx="103" cy={headY-headR+(baby?5:12)} rx="10" ry={baby?25:33} transform={`rotate(-15 103 ${headY-headR+(baby?5:12)})`} fill="#efc0ca" /></g><g className="rig-ear rig-ear--right"><ellipse cx="175" cy={headY-headR+(baby?7:14)} rx="18" ry={baby?33:40} transform={`rotate(15 175 ${headY-headR+(baby?7:14)})`} fill={fur} /><ellipse cx="175" cy={headY-headR+(baby?7:14)} rx="9" ry={baby?23:30} transform={`rotate(15 175 ${headY-headR+(baby?7:14)})`} fill="#efc0ca" /></g></> : cat ? <><path d={`M${140-headR} ${headY-22} ${140-headR+1} ${headY-67} ${140-headR+37} ${headY-40}Z`} fill={colors[1]} /><path d={`M${140+headR} ${headY-22} ${140+headR-1} ${headY-67} ${140+headR-37} ${headY-40}Z`} fill={colors[1]} /><path d={`M${140-headR+8} ${headY-34} ${140-headR+9} ${headY-55} ${140-headR+28} ${headY-39}Z`} fill="#e9b8c4" /><path d={`M${140+headR-8} ${headY-34} ${140+headR-9} ${headY-55} ${140+headR-28} ${headY-39}Z`} fill="#e9b8c4" /></> : !cloud ? <><circle cx={140-headR+4} cy={headY-headR+17} r="25" fill={fur} /><circle cx={140-headR+4} cy={headY-headR+17} r="14" fill="#dba975" /><circle cx={140+headR-4} cy={headY-headR+17} r="25" fill={fur} /><circle cx={140+headR-4} cy={headY-headR+17} r="14" fill="#dba975" /></> : null}
        {cloud ? <g fill={fur} filter={`url(#${id}-felt)`}><circle cx="102" cy={headY} r="35" /><circle cx="133" cy={headY-21} r="41" /><circle cx="173" cy={headY-8} r="35" /><circle cx="194" cy={headY+21} r="32" /><circle cx="155" cy={headY+37} r="37" /><circle cx="112" cy={headY+34} r="32" /><circle cx="84" cy={headY+19} r="29" /></g> : <ellipse cx="140" cy={headY} rx={headR} ry={headR*.87} fill={fur} stroke={colors[1]} strokeWidth=".8" filter={`url(#${id}-felt)`} />}
        {cat && <path d={`M116 ${headY+3}Q140 ${headY-17} 164 ${headY+3}L169 ${headY+36}Q140 ${headY+61} 111 ${headY+36}Z`} fill="#f7f3ee" />}
        {species==='bear' && <ellipse cx="140" cy={headY+22} rx="28" ry="22" fill="#fce4bc" />}
        <ellipse cx={140-headR*.58} cy={headY+17} rx="11" ry="7" fill="#e3a2a0" opacity=".6" /><ellipse cx={140+headR*.58} cy={headY+17} rx="11" ry="7" fill="#e3a2a0" opacity=".6" />
        <g className={`rig-eyes ${sleeping?'rig-eyes--closed':''}`} fill={colors[2]}>
          {sleeping || happy ? <><path d={`M${140-headR*.46} ${headY+2}q8 ${sleeping?8:-9} 16 0`} fill="none" stroke={colors[2]} strokeWidth="3.5" strokeLinecap="round" /><path d={`M${140+headR*.19} ${headY+2}q8 ${sleeping?8:-9} 16 0`} fill="none" stroke={colors[2]} strokeWidth="3.5" strokeLinecap="round" /></> : <><ellipse cx={140-headR*.34} cy={headY+1} rx="5" ry="7" /><ellipse cx={140+headR*.34} cy={headY+1} rx="5" ry="7" /><circle cx={138-headR*.34} cy={headY-2} r="1.6" fill="white" /><circle cx={138+headR*.34} cy={headY-2} r="1.6" fill="white" /></>}
        </g>
        {!cloud && <path d={`M132 ${headY+14}Q140 ${headY+10} 148 ${headY+14}Q148 ${headY+24} 140 ${headY+24}Q132 ${headY+24} 132 ${headY+14}`} fill={cat||moonRabbit?'#cf9c9f':colors[2]} />}
        <g className={eating?'rig-mouth rig-mouth--chew':'rig-mouth'}>{happy || eating ? <><path d={`M130 ${headY+29}Q140 ${headY+34} 150 ${headY+29}Q147 ${headY+47} 140 ${headY+46}Q132 ${headY+44} 130 ${headY+29}`} fill={colors[2]} /><path d={`M135 ${headY+40}q5-5 10 0`} stroke="#e69ca6" strokeWidth="5" strokeLinecap="round" /></> : <path d={`M131 ${headY+30}q9 8 18 0`} fill="none" stroke={colors[2]} strokeWidth="2.5" strokeLinecap="round" />}</g>
        {species==='bear' && <g className="rig-hat"><path d={`M90 ${headY-headR+13}Q105 ${headY-headR-34} 162 ${headY-headR-11}Q196 ${headY-headR-10} 190 ${headY-headR+23}Q180 ${headY-headR} 157 ${headY-headR+2}Z`} fill={`url(#${id}-blue)`} /><path d={`M88 ${headY-headR+16}Q130 ${headY-headR-1} 169 ${headY-headR+12}`} fill="none" stroke="#e8e6df" strokeWidth="11" strokeLinecap="round" /><circle cx="189" cy={headY-headR+26} r="10" fill="#f8f1df" /></g>}
        {moonRabbit && <g transform={`translate(177 ${headY-headR-7})`} fill="#fff4da">{[0,72,144,216,288].map(r=><ellipse key={r} cx="0" cy="-8" rx="5" ry="8" transform={`rotate(${r})`} />)}<circle r="6" fill="#efc767" /></g>}
        {cat && <><ellipse cx="140" cy={headY+4} rx={headR+9} ry={headR*.94} fill="none" stroke="#e7edf4" strokeWidth="7" /><path d={`M${140-headR-4} ${headY+16}q-3-35 21-51`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".65" /><path d={`M110 ${headY+headR*.86}q30 12 60 0`} fill="none" stroke="#739aba" strokeWidth="7" /></>}
      </g>
      {(species==='bear' || dress==='scarf' || dress==='blue-scarf') && <g className="rig-bandana">{(dress==='scarf'||dress==='blue-scarf')&&<path d={`M156 ${bodyY-27}L177 ${bodyY+15}L159 ${bodyY+28}L144 ${bodyY-22}Z`} fill="#498eae" stroke="#d1e6ec" strokeWidth="3"/>}<path d={`M108 ${bodyY-37}Q140 ${bodyY-24} 172 ${bodyY-37}L157 ${bodyY-8}Z`} fill={dress==='scarf'||dress==='blue-scarf'?'#498eae':'#728db7'} /><path d={star} transform={`translate(149 ${bodyY-24}) scale(.32)`} fill="#ffe397" /></g>}
      {['offer','tidy','play','ball'].includes(action) && <g className="rig-held-ball"><circle cx="141" cy="211" r="22" fill="#83b3ce" /><path d={star} transform="translate(141 211) scale(.62)" fill="#f8d879" /></g>}
      {eating && <g className="rig-snack"><path d="M122 206h36v20q-18 13-36 0Z" fill={action==='water'?'#87bacf':'#e7b55e'} /><ellipse cx="140" cy="206" rx="18" ry="5" fill={action==='water'?'#50879c':'#ad8154'} /></g>}
      {sleeping && <path className="rig-blanket" d="M73 219Q98 190 123 217Q161 189 203 219L211 254Q139 269 67 252Z" fill="#9bb49b" stroke="#829a83" strokeWidth="2" />}
      {action==='bath' && <g className="rig-bubbles" fill="#eaf7fc" stroke="#b8d7e7" strokeWidth="1">{[[80,213,16],[108,228,12],[198,211,17],[164,244,11],[208,171,9],[71,175,8]].map(([x,y,r])=><circle key={x} cx={x} cy={y} r={r} opacity=".85" />)}</g>}
    </g>
  </svg>
}
