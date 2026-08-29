import { useMemo, useState } from 'react'
import { appPath } from '../data/paths.js'
import { assistantSettings, assistantSuggestions, buildAssistantSuggestions } from '../modules/assistant/assistantModel.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { PageTitle } from '../ui/Shared.jsx'

function SettingsSwitch({ checked, disabled, label, copy, onChange }) {
  return <label className={`assistant-switch${disabled ? ' is-disabled' : ''}`}><span><strong>{label}</strong><small>{copy}</small></span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>
}

function SuggestionCard({ suggestion, onEdit, onApprove, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(suggestion.title)
  const [body, setBody] = useState(suggestion.body)
  const save = () => { onEdit(title.trim(), body.trim()); setEditing(false) }
  return <article className={`assistant-suggestion${suggestion.status === 'approved' ? ' is-approved' : ''}`}>
    <header><span>建议</span><small>{suggestion.evidence}</small></header>
    {editing ? <div className="assistant-suggestion__edit"><input aria-label="建议标题" value={title} onChange={(event) => setTitle(event.target.value)} /><textarea aria-label="建议内容" value={body} onChange={(event) => setBody(event.target.value)} /><div><button type="button" onClick={() => setEditing(false)}>取消</button><button type="button" className="button button--primary" disabled={!title.trim() || !body.trim()} onClick={save}>保存修改</button></div></div> : <><h3>{suggestion.title}</h3><p>{suggestion.body}</p><footer>{suggestion.status === 'approved' ? <b><Icon name="check" />已收进家长计划，不会自动改规则</b> : <><button type="button" onClick={() => setEditing(true)}>先修改</button><button type="button" className="button button--primary" onClick={onApprove}>确认采用</button></>}<button type="button" className="assistant-suggestion__delete" onClick={onDelete}>删除</button></footer></>}
  </article>
}

export function AssistantPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profileId = state.activeProfileId
  const profile = state.profiles.find((item) => item.id === profileId)
  const settings = assistantSettings(state, profileId)
  const suggestions = assistantSuggestions(state, profileId)
  const [message, setMessage] = useState('')
  const generated = useMemo(() => buildAssistantSuggestions(state, profileId), [profileId, state])
  const update = (patch) => dispatch({ type: 'UPDATE_ASSISTANT_SETTINGS', profileId, settings: patch })
  const generate = () => { dispatch({ type: 'CREATE_ASSISTANT_SUGGESTIONS', profileId, suggestions: generated }); setMessage(`已在本机整理 ${generated.length} 条建议，等待你确认。`) }
  const removeAll = () => {
    if (!window.confirm(`删除为 ${profile.name} 整理的全部建议和问答记录？原始任务、成长记录不会删除。`)) return
    dispatch({ type: 'DELETE_ASSISTANT_DERIVED', profileId })
    setMessage('派生内容已删除，原始成长记录保持不变。')
  }
  return <section className="assistant-page">
    <PageTitle title="小队助手" subtitle="先在本机整理，再由家长修改和确认；关闭后不影响任务、花园和成长记录。" icon="sparkle" />
    {message ? <div className="form-success" role="status">{message}</div> : null}
    <div className="assistant-hero">
      <img src={appPath('assets/assistant/assistant-hero.webp')} alt="小队助手的家庭观察台" />
      <div><span className="assistant-kicker">受控建议 · 默认关闭</span><h2>把零散记录整理成<br />家长能判断的线索</h2><p>不会替孩子下结论，不打分，不自动修改任何规则。</p></div>
      <SettingsSwitch checked={settings.enabled} label="启用小队助手" copy={settings.enabled ? '只使用你允许的数据范围' : '核心功能照常使用，不产生新建议'} onChange={(enabled) => update({ enabled })} />
    </div>
    <div className="assistant-grid">
      <article className="assistant-panel"><header><div><span>允许整理的内容</span><h3>数据范围由家长决定</h3></div><Icon name="shield" /></header>
        <SettingsSwitch checked={settings.scopes.activitySummary} disabled={!settings.enabled} label="活动摘要" copy="只读完成次数与求助记录" onChange={(activitySummary) => update({ scopes: { activitySummary } })} />
        <SettingsSwitch checked={settings.scopes.childQuotes} disabled={!settings.enabled} label="孩子的一句话" copy="只包含孩子主动选择或说出的内容" onChange={(childQuotes) => update({ scopes: { childQuotes } })} />
        <SettingsSwitch checked={false} disabled label="照片与语音" copy="当前版本不开放整理，也不会上传" onChange={() => {}} />
        <SettingsSwitch checked={settings.childOneQuestion} disabled={!settings.enabled} label="孩子的一问一答" copy="每次只出现一个选择题，可直接跳过" onChange={(childOneQuestion) => update({ childOneQuestion })} />
        <div className="assistant-privacy"><Icon name="shield" /><span><strong>外部 AI 上传：关闭</strong><small>当前版本只在家庭应用内整理，不向外部模型发送照片、语音或活动数据。</small></span></div>
      </article>
      <article className="assistant-panel assistant-panel--action"><header><div><span>本周建议</span><h3>家长确认前，不会生效</h3></div><Icon name="book" /></header>
        <p>建议来自已有记录，并明确写出依据。你可以先改字，再决定要不要采用。</p>
        <button className="button button--primary" type="button" disabled={!settings.enabled} onClick={generate}>{suggestions.length ? '重新查看本周线索' : '整理本周建议'}</button>
        <small>{settings.enabled ? '不会生成奖励、惩罚或孩子标签。' : '开启助手后才会整理建议。'}</small>
        <button className="assistant-delete-all" type="button" disabled={!suggestions.length && !Object.values(state.modules?.assistant?.reflections || {}).some((item) => item.profileId === profileId)} onClick={removeAll}>删除全部助手派生内容</button>
      </article>
    </div>
    {suggestions.length ? <div className="assistant-suggestions">{suggestions.map((suggestion) => <SuggestionCard key={suggestion.id} suggestion={suggestion} onEdit={(title, body) => dispatch({ type: 'EDIT_ASSISTANT_SUGGESTION', profileId, suggestionId: suggestion.id, title, body })} onApprove={() => dispatch({ type: 'APPROVE_ASSISTANT_SUGGESTION', profileId, suggestionId: suggestion.id })} onDelete={() => dispatch({ type: 'DELETE_ASSISTANT_DERIVED', profileId, suggestionId: suggestion.id })} />)}</div> : null}
  </section>
}
