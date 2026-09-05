import { useState } from 'react'
import { AGE_BANDS, CHARACTER_OPTIONS, getActiveProfile, THEME_OPTIONS, uid } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Modal, PageTitle, Segmented } from '../ui/Shared.jsx'
import { AssetArt, CompanionArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'
import { ThemeScene } from '../ui/ThemeArt.jsx'

function AddChildModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', ageBand: '7–9 岁', companionMode: 'together' })
  const [error, setError] = useState('')
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = () => {
    const name = form.name.trim()
    if (!name) { setError('请填写孩子昵称。'); return }
    onCreate({ id: uid('child'), ...form, name })
  }
  return (
    <Modal title="新增孩子" onClose={onClose} className="add-child-modal">
      <CompanionArt id="bear" className="new-child-avatar" decorative />
      <h2>为另一个孩子建立独立计划</h2>
      <p>作息、流程、星星和记录都会分别保存，家庭愿望单继续共享。</p>
      <label>孩子昵称<input autoFocus value={form.name} maxLength={8} placeholder="例如：小禾" onChange={(event) => update('name', event.target.value)} /></label>
      <label>年龄段<select value={form.ageBand} onChange={(event) => update('ageBand', event.target.value)}>{AGE_BANDS.map((age) => <option key={age}>{age}</option>)}</select></label>
      <div className="field-block"><span>陪伴方式</span><Segmented label="新孩子陪伴方式" value={form.companionMode} onChange={(value) => update('companionMode', value)} options={[{ value: 'together', label: '一起完成' }, { value: 'independent', label: '自己完成' }]} /></div>
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <button className="button button--primary button--wide" type="button" onClick={submit}>建立孩子档案</button>
    </Modal>
  )
}

export function ProfilePage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setSaved(false) }
  const save = () => { dispatch({ type: 'UPDATE_PROFILE', payload: form }); setSaved(true) }
  const selectedCharacter = CHARACTER_OPTIONS.find((item) => item.id === form.character)
  const addProfile = (nextProfile) => {
    dispatch({ type: 'ADD_PROFILE', payload: nextProfile })
    setAddOpen(false)
  }
  const deleteProfile = () => {
    dispatch({ type: 'DELETE_PROFILE', profileId: profile.id })
    setDeleteOpen(false)
  }

  return (
    <section>
      <div className="profile-heading"><PageTitle title="孩子资料" subtitle="每个孩子都有独立的作息、流程、星星和睡前记录。" /><button className="button button--secondary" type="button" aria-label="新增孩子" onClick={() => setAddOpen(true)}>＋ 新增孩子</button></div>
      <div className="child-roster" aria-label="家庭孩子档案">
        {state.profiles.map((item) => <button type="button" key={item.id} className={item.id === state.activeProfileId ? 'is-active' : ''} onClick={() => dispatch({ type: 'SWITCH_PROFILE', profileId: item.id })}><CompanionArt id={item.character} decorative /><strong>{item.name}</strong><small>{item.id === state.activeProfileId ? '当前孩子' : '切换'}</small></button>)}
        <button type="button" className="child-roster__add" aria-label="新增孩子" onClick={() => setAddOpen(true)}><span>＋</span><strong>新增孩子</strong><small>独立保存</small></button>
      </div>
      <div className="profile-layout">
        <article className="profile-settings">
          <h2>基本信息</h2>
          <div className="form-grid form-grid--two"><label>昵称<input value={form.name} maxLength={8} onChange={(event) => update('name', event.target.value)} /></label><label>年龄段<select value={form.ageBand} onChange={(event) => update('ageBand', event.target.value)}>{AGE_BANDS.map((age) => <option key={age}>{age}</option>)}</select></label></div>
          <div className="field-block"><span>任务完成模式</span><Segmented label="任务完成模式" value={form.companionMode} onChange={(value) => update('companionMode', value)} options={[{ value: 'together', label: '一起完成' }, { value: 'independent', label: '孩子自己完成' }]} /><small>只影响提示方式，不会改变星星规则。</small></div>
          <h2>选择陪伴角色</h2>
          <div className="choice-grid choice-grid--characters">{CHARACTER_OPTIONS.map((item) => <button key={item.id} type="button" className={form.character === item.id ? 'is-selected' : ''} onClick={() => update('character', item.id)}><CompanionArt id={item.id} decorative /><strong>{item.name}</strong>{form.character === item.id ? <i><Icon name="check" size={15} /></i> : null}</button>)}</div>
          <h2>选择夜晚主题</h2>
          <div className="choice-grid choice-grid--themes">{THEME_OPTIONS.map((item) => <button key={item.id} type="button" className={`theme-choice theme-choice--${item.id} ${form.theme === item.id ? 'is-selected' : ''}`} onClick={() => update('theme', item.id)}><AssetArt id={item.assetId} decorative /><strong>{item.name}</strong>{form.theme === item.id ? <i><Icon name="check" size={15} /></i> : null}</button>)}</div>
          {state.profiles.length > 1 ? <button className="text-button text-button--danger profile-delete" type="button" onClick={() => setDeleteOpen(true)}>删除 {profile.name} 的档案与记录</button> : null}
        </article>
        <aside className={`profile-preview theme-choice--${form.theme}`}><span className="preview-label">完整主题预览</span><ThemeScene theme={form.theme} character={selectedCharacter?.id} pose="waiting" label={`${selectedCharacter?.name || '陪伴角色'}主题预览`} className="profile-preview__scene" /><h2>晚安，{form.name}</h2><p>{selectedCharacter?.name}正在{THEME_OPTIONS.find((item) => item.id === form.theme)?.name}等你</p></aside>
      </div>
      <div className="sticky-save"><span><Icon name="check" size={16} /> 保存后立即用于 {form.name} 的孩子模式</span>{saved ? <em>已保存</em> : null}<button className="button button--primary" type="button" onClick={save}>保存资料</button></div>
      {addOpen ? <AddChildModal onClose={() => setAddOpen(false)} onCreate={addProfile} /> : null}
      {deleteOpen ? <Modal title="删除孩子档案" onClose={() => setDeleteOpen(false)} className="delete-modal"><div className="danger-icon">!</div><h2>删除 {profile.name} 的全部记录？</h2><p>作息、流程、星星、兑换申请和历史都会永久删除，其他孩子不受影响。</p><button className="button button--danger button--wide" type="button" onClick={deleteProfile}>确认删除 {profile.name}</button><button className="button button--secondary button--wide" type="button" onClick={() => setDeleteOpen(false)}>保留孩子档案</button></Modal> : null}
    </section>
  )
}
