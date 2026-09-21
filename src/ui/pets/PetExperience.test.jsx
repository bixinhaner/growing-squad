import { useCallback, useRef, useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PetCreature } from './PetCreature.jsx'
import { EggArt } from './PetArt.jsx'
import { PetStudio, FamilyGarden, WorkPreview } from './PetStudio.jsx'
import { PetRoomArranger, PetSnapshot } from './PetLifePanels.jsx'
import { PetPlay } from './PetPlay.jsx'
import { PetHomePage } from '../../pages/PetHomePage.jsx'
import { BedtimeStateContext, BedtimeActionsContext } from '../../store/contexts.js'
import { createDefaultData } from '../../domain/model.js'
import { normalizeV7, toLegacyView } from '../../domain/v7.js'
import { rootReducer } from '../../modules/registry.js'
import { createOperationEnvelope } from '../../core/sync/operationSchemas.js'
import { PET_DEFAULT_SETTINGS, petFor } from '../../modules/pets/petModel.js'

const T=new Date('2026-09-21T16:00:00+08:00').getTime()
let seq=0
function next(state,type,payload={},at=T){return rootReducer(state,createOperationEnvelope({type,timestamp:at,...payload},'child-1',++seq))}
function fixture(hatched=true){
  let state=createDefaultData();state.family.timezone='Asia/Shanghai'
  state=next(state,'PET_ADOPT',{species:'bear',name:'糯糯'},T-7*3600000)
  if(hatched)state=next(state,'PET_HATCH')
  return state
}
function Harness({initial,children}) {
  const [value,setValue]=useState(()=>normalizeV7(initial))
  const latest=useRef(value)
  const dispatch=useCallback(async(action)=>{
    try{
      const result=rootReducer(latest.current,createOperationEnvelope(action,action.profileId||'child-1',++seq))
      latest.current=result;setValue(result)
      return {ok:true,state:result}
    }catch(error){return {ok:false,message:error.message}}
  },[])
  return <MemoryRouter><BedtimeStateContext.Provider value={{state:toLegacyView(value,'child-1'),cloud:{mode:'local'},saveStatus:'saved'}}><BedtimeActionsContext.Provider value={{dispatch,retrySave:()=>{}}}>{children}<output data-testid="saved-state">{JSON.stringify(value.modules.pets)}</output></BedtimeActionsContext.Provider></BedtimeStateContext.Provider></MemoryRouter>
}
const pet=()=>petFor(fixture())
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();localStorage.clear()})

describe('artwork and readable surfaces',()=>{
  it.each(['bear','rabbit','cloud','space-cat'])('%s renders separately articulated limbs and three actual body proportions',species=>{
    const view=render(<PetCreature species={species} age="baby" />)
    const before=view.container.querySelector('.rig-body ellipse').getAttribute('ry')
    expect(view.container.querySelectorAll('.rig-arm')).toHaveLength(2)
    view.rerender(<PetCreature species={species} age="adult" />)
    expect(view.container.querySelector('.rig-body ellipse').getAttribute('ry')).not.toBe(before)
    expect(view.container.querySelector('svg')).toHaveAttribute('data-age','adult')
  })
  it('keeps all four egg-to-species names explicit, not a randomized blind box',()=>{
    const view=render(<><EggArt species="bear"/><EggArt species="rabbit"/><EggArt species="cloud"/><EggArt species="space-cat"/></>)
    expect(within(view.container).getAllByRole('img').map(n=>n.getAttribute('aria-label'))).toEqual(['森林蛋','月光蛋','云朵蛋','太空蛋'])
  })
  it('differentiates purchased scarf geometry from the default bandana',()=>{
    const view=render(<PetCreature species="bear"/>),before=view.container.querySelectorAll('.rig-bandana path').length
    view.rerender(<PetCreature species="bear" dress="scarf"/>)
    expect(view.container.querySelectorAll('.rig-bandana path').length).toBeGreaterThan(before)
  })
  it('renders a saved room snapshot with independently sized nested illustrations',()=>{
    const view=render(<PetSnapshot snapshot={{species:'bear',name:'过去的小熊',room:'forest',stage:'baby',placed:{lamp:'star-lamp'},layout:{'star-lamp':{x:25,y:55}}}}/>)
    expect(screen.getByRole('img',{name:/过去的小熊/})).toBeVisible()
    const prop=view.container.querySelector('.pet-prop')
    expect(prop).toHaveAttribute('width','56')
  })
})

describe('creative interaction components use real editable works',()=>{
  it('places, rotates, removes and undoes a block without duplicate occupancy',async()=>{
    const saved=vi.fn(),changes=vi.fn(),user=userEvent.setup()
    render(<PetStudio kind="blocks" pet={pet()} onSave={saved} onChange={changes}/>)
    await user.click(screen.getByRole('button',{name:'放一块黄色积木'}))
    expect(changes.mock.lastCall[0].blocks).toHaveLength(1)
    await user.click(screen.getByRole('button',{name:'旋转这块'}))
    expect(changes.mock.lastCall[0].blocks[0].turn).toBe(1)
    await user.click(screen.getByRole('button',{name:'移走这块'}))
    expect(changes.mock.lastCall[0].blocks).toHaveLength(0)
    await user.click(screen.getByRole('button',{name:'撤销上一步'}))
    await user.click(screen.getByRole('button',{name:'保存这件作品'}))
    expect(saved.mock.lastCall[0].blocks).toHaveLength(1)
  })
  it('allows the child to reorder and remove a specific theater act',async()=>{
    const user=userEvent.setup(),saved=vi.fn()
    render(<PetStudio kind="theater" pet={pet()} onSave={saved}/>)
    await user.click(screen.getByRole('button',{name:'挥挥手',exact:true}))
    await user.click(screen.getByRole('button',{name:'盖被子',exact:true}))
    await user.click(screen.getByRole('button',{name:'把第2个动作提前'}))
    await user.click(screen.getByRole('button',{name:'保存这件作品'}))
    expect(saved.mock.lastCall[0].acts).toEqual(['sleep','wave'])
    await user.click(screen.getByRole('button',{name:'移走第1个动作'}))
    await user.click(screen.getByRole('button',{name:'保存这件作品'}))
    expect(saved.mock.lastCall[0].acts).toEqual(['wave'])
  })
  it('replays a custom theater sequence and automatically stops at the end',async()=>{
    vi.useFakeTimers()
    render(<WorkPreview work={{kind:'theater',title:'演出',scene:'space',acts:['wave','sleep']}} pet={pet()} replay/>)
    fireEvent.click(screen.getByRole('button',{name:'重看我的小剧场'}))
    await act(async()=>vi.advanceTimersByTimeAsync(2500))
    expect(document.querySelector('.pet-rig')).toHaveAttribute('data-action','sleep')
    await act(async()=>vi.advanceTimersByTimeAsync(2500))
    expect(screen.getByRole('button',{name:'重看我的小剧场'})).toBeVisible()
  })
  it('supports keyboard-accessible drawing stamps and preserves their real paths',async()=>{
    const user=userEvent.setup(),save=vi.fn()
    render(<PetStudio kind="drawing" pet={pet()} onSave={save}/>)
    await user.click(screen.getByRole('button',{name:'也可以贴一座小山'}))
    await user.click(screen.getByRole('button',{name:'保存这件作品'}))
    expect(save.mock.lastCall[0].strokes[0].points).toHaveLength(4)
  })
  it('robot options change its rendered outcome rather than only a descriptive label',async()=>{
    const user=userEvent.setup()
    const view=render(<PetStudio kind="robot" pet={pet()} onSave={vi.fn()}/>)
    expect(view.container.querySelector('.pet-robot-track')).toHaveAttribute('data-outcome','stuck')
    await user.click(screen.getByRole('button',{name:'大轮子',exact:true}))
    expect(view.container.querySelector('.pet-robot-track')).toHaveAttribute('data-outcome','spill')
    await user.click(screen.getByRole('button',{name:'高挡板',exact:true}))
    expect(view.container.querySelector('.pet-robot-track')).toHaveAttribute('data-outcome','delivered')
  })
  it('saves a chosen garden flower without inventing another child contribution',async()=>{
    const user=userEvent.setup(),saved=vi.fn(),one=pet(),two={...pet(),id:'pet:child-2',profileId:'child-2',name:'妹妹伙伴'}
    render(<FamilyGarden pet={one} pets={[one,two]} onSave={saved}/>)
    await user.click(screen.getByRole('button',{name:'星星花'}))
    await user.click(screen.getByRole('button',{name:'左边',exact:true}))
    await user.click(screen.getByRole('button',{name:'把我的小花种好'}))
    expect(saved.mock.lastCall[0]).toMatchObject({flower:'star',place:'left'})
    expect(screen.getAllByText('还没有布置，不会代替这位孩子记录参与。')).toHaveLength(2)
  })
  it('can position an item without dragging and persists exact relative coordinates',async()=>{
    const user=userEvent.setup(),saved=vi.fn(async()=>true)
    render(<PetRoomArranger pet={pet()} onSave={saved}/>)
    await user.click(screen.getByRole('button',{name:'右一点'}))
    await user.click(screen.getByRole('button',{name:'保存摆放'}))
    expect(saved).toHaveBeenCalledWith('food',{x:20,y:76})
  })
})

describe('save and stop behavior',()=>{
  it('closes a creative round with its latest draft, even without pressing save',async()=>{
    vi.useFakeTimers();vi.setSystemTime(T)
    const saved=vi.fn(async()=>true),draft=vi.fn(),p=pet()
    render(<PetPlay pet={p} session={{id:'round',game:'drawing',startedAt:T,endedAt:null}} onFinish={saved} onDraft={draft}/>)
    fireEvent.click(screen.getByRole('button',{name:'也可以贴一座小山'}))
    await act(async()=>vi.advanceTimersByTimeAsync(700))
    expect(draft.mock.lastCall[0].strokes).toHaveLength(1)
    fireEvent.click(screen.getByRole('button',{name:'现在回小屋'}))
    await act(async()=>{})
    expect(saved.mock.lastCall[0]).toBe(false)
    expect(saved.mock.lastCall[2].strokes).toHaveLength(1)
  })
  it('a time budget stops and preserves an existing creative draft',async()=>{
    vi.useFakeTimers();vi.setSystemTime(T)
    const saved=vi.fn(async()=>true),work={kind:'theater',title:'我的故事',scene:'forest',acts:['wave']}
    render(<PetPlay pet={pet()} session={{id:'round',game:'theater',startedAt:T,endedAt:null,work}} onFinish={saved} timeLeft={0}/>)
    await act(async()=>{})
    expect(saved).toHaveBeenCalledWith(false,[],work)
  })
  it('home page adopts a selected egg and stores its name through the real reducer',async()=>{
    const state=createDefaultData();state.family.timezone='Asia/Shanghai'
    const user=userEvent.setup()
    render(<Harness initial={state}><PetHomePage/></Harness>)
    await user.click(screen.getByRole('button',{name:/月光蛋，月兔/}))
    await user.clear(screen.getByLabelText('给小伙伴取个名字'))
    await user.type(screen.getByLabelText('给小伙伴取个名字'),'月月')
    await user.click(screen.getByRole('button',{name:'把这颗蛋带回家'}))
    expect(screen.getByRole('heading',{name:'月月',exact:true})).toBeVisible()
    expect(JSON.parse(screen.getByTestId('saved-state').textContent).byProfile['child-1']).toMatchObject({species:'rabbit',name:'月月',hatchedAt:null})
  })
  it('ready egg can hatch and the dialog closes without changing Tonight or the reward ledger',async()=>{
    vi.spyOn(Date,'now').mockReturnValue(T)
    const user=userEvent.setup(),state=fixture(false)
    render(<Harness initial={state}><PetHomePage/></Harness>)
    await user.click(screen.getByRole('button',{name:'一起迎接破壳'}))
    expect(screen.getByRole('dialog',{name:'我们的第一次见面'})).toBeVisible()
    await user.click(screen.getByRole('button',{name:'抱抱我的小伙伴'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(JSON.parse(screen.getByTestId('saved-state').textContent).byProfile['child-1'].hatchedAt).toBeTruthy()
  })
  it('a goal works even when the balance is zero and it does not create a purchase',async()=>{
    const user=userEvent.setup()
    render(<Harness initial={fixture()}><PetHomePage/></Harness>)
    await user.click(screen.getByRole('button',{name:/徽章小铺，余额/}))
    const card=screen.getByRole('heading',{name:'星星小夜灯'}).closest('article')
    await user.click(within(card).getByRole('button',{name:'先看看'}))
    await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'记下这个小愿望'}))
    const pets=JSON.parse(screen.getByTestId('saved-state').textContent)
    expect(pets.byProfile['child-1'].life.goalItemId).toBe('star-lamp')
    expect(pets.requests).toEqual({})
  })
  it('simple mode exposes three play choices first and can reveal the rest',async()=>{
    const user=userEvent.setup(),state=fixture();state.modules.pets.settingsByProfile['child-1']={...PET_DEFAULT_SETTINGS,simpleMode:true}
    render(<Harness initial={state}><PetHomePage/></Harness>)
    await user.click(screen.getByRole('button',{name:'玩耍',exact:true}))
    expect(document.querySelectorAll('.pet-catalog>article')).toHaveLength(3)
    await user.click(screen.getByRole('button',{name:'看看更多玩法'}))
    expect(document.querySelectorAll('.pet-catalog>article').length).toBeGreaterThan(3)
  })
})
