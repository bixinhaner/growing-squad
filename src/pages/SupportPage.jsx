import { useMemo } from 'react'
import { getScaffoldStates, getScaffoldSuggestion, SCAFFOLD_LEVELS } from '../core/scaffold/scaffoldEngine.js'
import { getActiveProfile } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'
import { appPath } from '../data/paths.js'

export function SupportPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const states = useMemo(() => getScaffoldStates(state, profile.id), [profile.id, state])
  const suggestion = getScaffoldSuggestion(states)
  const groups = [...new Set(states.map((item) => item.group))]
  const setLevel = (capability, level) => dispatch({
    type: 'UPDATE_SCAFFOLD', profileId: profile.id, capabilityId: capability.id,
    capabilityKey: capability.key, level,
  })
  return (
    <section className="support-page">
      <header className="platform-page-header"><div><span className="eyebrow">孩子与支持</span><h1>支持会跟着孩子的需要改变</h1><p>不是升级，也不是考核。哪种方式更合适，就先用哪种。</p></div></header>
      <div className="support-workspace">
        <div className="support-groups">
          {groups.map((group) => <section key={group} className="support-group"><h2>{group}</h2>{states.filter((item) => item.group === group).map((capability) => <article key={capability.id}><AssetArt id={capability.assetId} decorative /><strong>{capability.title}</strong><div className="support-levels" role="group" aria-label={`${capability.title}的支持方式`}>{SCAFFOLD_LEVELS.map((level) => <button key={level.id} type="button" className={Number(capability.level) === level.id ? 'is-active' : ''} onClick={() => setLevel(capability, level.id)}>{level.label}</button>)}</div></article>)}</section>)}
          <p className="support-reassurance"><Icon name="heart" /> 开学、生病或生活变化时，随时增加陪伴，不代表退步。</p>
        </div>
        {suggestion ? <aside className="support-suggestion"><span className="suggestion-badge"><Icon name="sparkle" /> 小队建议</span><img className="support-suggestion__art" src={appPath('assets/platform/support-pack-bag.webp')} alt="孩子正在自己整理书包" /><h2>{suggestion.title}</h2><p>{suggestion.body}</p><div><button type="button" className="button button--primary" onClick={() => { const capability = states.find((item) => item.id === suggestion.capabilityId); if (capability) setLevel(capability, suggestion.nextLevel) }}>试一周</button><button type="button" className="button button--secondary">先不调整</button></div><small>建议不会自动生效，只有家长确认后才会改变。</small></aside> : null}
      </div>
    </section>
  )
}
