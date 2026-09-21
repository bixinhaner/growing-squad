import { useCallback, useRef, useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BedtimeStateContext, BedtimeActionsContext } from '../../store/contexts.js'
import { createDefaultData } from '../../domain/model.js'
import { normalizeV7, toLegacyView } from '../../domain/v7.js'
import { rootReducer } from '../../modules/registry.js'
import { createOperationEnvelope } from '../../core/sync/operationSchemas.js'
import { PET_DEFAULT_SETTINGS, petFor } from '../../modules/pets/petModel.js'
import { badgeBalance, levelProgress } from '../../modules/pets/petEconomy.js'
import { PetHomePage } from '../../pages/PetHomePage.jsx'
import { PetParentPage } from '../../pages/PetParentPage.jsx'
import { PetActor, EggArt } from './PetArt.jsx'
import { EggMeadow, BadgeItemDialog } from './PetEconomyPanels.jsx'
const T=Date.parse('2026-09-21T12:00:00+08:00')
let seq=0
function action(state,type,payload={},at=T){return rootReducer(state,createOperationEnvelope({type,timestamp:at,...payload},'child-1',++seq))}
function fixture(auto=true){
  let state=createDefaultData();state.family.timezone='Asia/Shanghai'
  state.starLedger=state.rewards.starLedger=[{id:'synthetic-stars',profileId:'child-1',delta:50,reason:'测试奖励',createdAt:T}]
  state=action(state,'PET_ADOPT',{species:'unicorn',name:'彩彩',economyVersion:2},T-7*3600000)
  state=action(state,'PET_HATCH')
  state.modules.pets.settingsByProfile['child-1']={...PET_DEFAULT_SETTINGS,spending:auto?'allowance':'ask',dailyAllowance:20}
  return state
}
function Harness({initial,children}){
  const [state,setState]=useState(()=>normalizeV7(initial));const last=useRef(state)
  const dispatch=useCallback(async a=>{try{const next=rootReducer(last.current,createOperationEnvelope({...a,timestamp:T},a.profileId||'child-1',++seq));last.current=next;setState(next);return {ok:true,state:next}}catch(e){return {ok:false,message:e.message}}},[])
  return <MemoryRouter><BedtimeStateContext.Provider value={{state:toLegacyView(state,'child-1'),cloud:{mode:'local'},saveStatus:'saved'}}><BedtimeActionsContext.Provider value={{dispatch,retrySave:()=>{}}}>{children}<output data-testid="state">{JSON.stringify(state)}</output></BedtimeActionsContext.Provider></BedtimeStateContext.Provider></MemoryRouter>
}
const state=()=>JSON.parse(screen.getByTestId('state').textContent)
async function feedFive(user){
  await user.click(screen.getByRole('button',{name:'5 颗',exact:true}))
  await user.click(screen.getByRole('button',{name:'喂一点星光'}))
  await user.click(within(screen.getByRole('dialog',{name:'确认这次星光培养'})).getByRole('button',{name:'确认投入 5 颗星光'}))
}
afterEach(()=>{cleanup();vi.restoreAllMocks()})
describe('child-visible star growth and badge shop',()=>{
  it('feeds five, shows a real level-up and fifteen badges, then closes without a second grant',async()=>{
    vi.spyOn(Date,'now').mockReturnValue(T);const user=userEvent.setup()
    render(<Harness initial={fixture()}><PetHomePage/></Harness>)
    await feedFive(user)
    expect(screen.getByRole('heading',{name:'彩彩升到 2 级啦'})).toBeVisible()
    expect(badgeBalance(petFor(state()))).toBe(15)
    expect(state().rewards.starLedger.reduce((n,e)=>n+e.delta,0)).toBe(45)
    await user.click(screen.getByRole('button',{name:'抱抱小伙伴'}))
    await user.click(screen.getByRole('button',{name:'重看最近一次升级'}))
    expect(badgeBalance(petFor(state()))).toBe(15)
    expect(levelProgress(petFor(state())).level).toBe(2)
  })
  it('parent mode requests rather than charging immediately; cancelling preserves stars',async()=>{
    vi.spyOn(Date,'now').mockReturnValue(T);const user=userEvent.setup()
    render(<Harness initial={fixture(false)}><PetHomePage/></Harness>)
    await user.click(screen.getByRole('button',{name:'5 颗',exact:true}));await user.click(screen.getByRole('button',{name:'喂一点星光'}))
    await user.click(screen.getByRole('button',{name:'请家长同意这次培养'}))
    expect(petFor(state()).economy.invested).toBe(0)
    expect(Object.values(state().modules.pets.requests)[0].status).toBe('pending')
    await user.click(screen.getByRole('button',{name:'取消这次申请'}))
    expect(Object.values(state().modules.pets.requests)[0].status).toBe('cancelled')
    expect(state().rewards.starLedger).toHaveLength(1)
  })
  it('a dress preview is free and explicit confirmation spends one badge, not a star',async()=>{
    vi.spyOn(Date,'now').mockReturnValue(T);const user=userEvent.setup()
    render(<Harness initial={fixture()}><PetHomePage/></Harness>)
    await feedFive(user);await user.click(screen.getByRole('button',{name:'抱抱小伙伴'}))
    await user.click(screen.getByRole('button',{name:/徽章小铺，余额/}))
    await user.click(screen.getByRole('button',{name:'预览花花公主裙'}))
    await user.click(screen.getByRole('button',{name:'试穿一下，不扣徽章'}))
    expect(document.querySelector('.plush-outfit-dress-pink')).toBeTruthy();expect(badgeBalance(petFor(state()))).toBe(15)
    await user.click(screen.getByRole('button',{name:'确认兑换 · 1 枚徽章'}))
    expect(badgeBalance(petFor(state()))).toBe(14)
    expect(petFor(state()).inventory['pink-dress']).toBeTruthy()
    expect(state().rewards.starLedger.reduce((n,e)=>n+e.delta,0)).toBe(45)
  })
  it('a house costs two badges and can be placed with an actual interaction',async()=>{
    vi.spyOn(Date,'now').mockReturnValue(T);const user=userEvent.setup()
    let start=fixture();start=action(start,'PET_REQUEST_GROWTH',{amount:5,requestId:'gift'});start=action(start,'PET_EXCHANGE_BADGES',{itemId:'strawberry-house',requestId:'house'})
    render(<Harness initial={start}><PetHomePage/></Harness>)
    await user.click(screen.getByRole('button',{name:'布置',exact:true}))
    const card=screen.getByRole('heading',{name:'草莓小屋'}).closest('article')
    await user.click(within(card).getByRole('button',{name:'摆到小屋'}))
    await user.click(screen.getByRole('button',{name:'回小屋看看'}))
    expect(screen.getByRole('button',{name:'住进草莓小屋'})).toBeVisible()
    expect(petFor(state()).placed.house).toBe('strawberry-house')
    expect(badgeBalance(petFor(state()))).toBe(13)
  })
  it('a parent can approve cultivation and sees both distinct balances',async()=>{
    vi.spyOn(Date,'now').mockReturnValue(T);const user=userEvent.setup()
    const start=action(fixture(false),'PET_REQUEST_GROWTH',{amount:5,requestId:'ask'})
    render(<Harness initial={start}><PetParentPage/></Harness>)
    await user.click(screen.getByRole('button',{name:'同意这次培养'}))
    expect(badgeBalance(petFor(state()))).toBe(15)
    expect(screen.getByText(/\+15 枚徽章/)).toBeVisible()
  })
  it('insufficient stars leave free care accessible without a purchase dialog',async()=>{
    vi.spyOn(Date,'now').mockReturnValue(T);const start=fixture();start.rewards.starLedger=[];start.starLedger=[]
    render(<Harness initial={start}><PetHomePage/></Harness>)
    expect(screen.getByRole('button',{name:'喂一点星光'})).toBeDisabled()
    expect(screen.getByRole('button',{name:'准备食物',exact:true})).toBeEnabled()
  })
  it('all eight egg choices provide a real preview before committing the adoption',async()=>{
    const user=userEvent.setup(),selected=vi.fn()
    render(<Harness initial={createDefaultData()}><EggMeadow species="unicorn" name="彩彩" onSpecies={selected} onName={()=>{}} onAdopt={()=>{}}/></Harness>)
    expect(screen.getAllByRole('button',{name:/免费预览/})).toHaveLength(8)
    await user.click(screen.getByRole('button',{name:/月舞蛋，九尾狐/}))
    expect(selected.mock.lastCall[0].id).toBe('fox')
  })
  it.each(['unicorn','puppy','rabbit','fox','chick'])('%s uses generated assets for eggs and six usable poses',species=>{
    const view=render(<><EggArt species={species}/><PetActor species={species} motion="feed" size="young"/><PetActor species={species} motion="signature" size="adult"/></>)
    expect(view.container.querySelector('.plush-egg image').getAttribute('href')).toContain(`/eggs/${species}.webp`)
    expect(view.container.querySelector('.plush-body').getAttribute('src')).toContain('/eating.webp')
    expect(view.container.querySelector('.plush-growth-token')).toBeTruthy()
    expect(view.container.querySelector('.plush-signature')).toBeTruthy()
  })
  it('badge item dialog never confirms when funds are insufficient',()=>{
    render(<BadgeItemDialog item={{id:'test',name:'房子',category:'house',badgePrice:2,art:'house-moon'}} pet={petFor(fixture())} onClose={()=>{}} onGoal={()=>{}}/>)
    expect(screen.getByRole('button',{name:'确认兑换 · 2 枚徽章'})).toBeDisabled()
  })
})
