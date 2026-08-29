import { Link } from 'react-router-dom'
import { appPath } from '../data/paths.js'
import { assistantSettings, assistantSuggestions, buildWeeklyReport } from '../modules/assistant/assistantModel.js'
import { useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { PageTitle } from '../ui/Shared.jsx'

export function WeeklyReportPage() {
  const { state } = useBedtimeState()
  const profileId = state.activeProfileId
  const profile = state.profiles.find((item) => item.id === profileId)
  const report = buildWeeklyReport(state, profileId)
  const settings = assistantSettings(state, profileId)
  const pending = assistantSuggestions(state, profileId).filter((item) => item.status !== 'approved').length
  return <section className="weekly-report">
    <PageTitle title={`${profile.name}的小队周报`} subtitle="用真实片段回看这一周，不排名、不贴标签，也不把一次表现当成性格。" icon="book" />
    <div className="weekly-report__hero">
      <div><span>过去 7 天 · 家庭观察手记</span><h2>{report.headline}</h2><p>{report.subline}</p><small><Icon name="shield" />周报来自本地结构化记录，关闭助手也能查看。</small></div>
      <img src={appPath('assets/assistant/weekly-moments-atlas.webp')} alt="孩子这一周的睡前、运动、阅读和家庭活动片段" />
    </div>
    <div className="weekly-report__moments">{report.moments.map((moment, index) => <article key={moment.id}><span className={`weekly-report__crop crop-${index}`} style={{ backgroundImage: `url(${appPath('assets/assistant/weekly-moments-atlas.webp')})` }} aria-hidden="true" /><div><small>{moment.title}</small><h3>{moment.value}<em>{moment.unit}</em></h3><p>{moment.copy}</p></div></article>)}</div>
    <aside className="weekly-report__footer"><div><Icon name="heart" /><span><strong>下周只保留一个方向</strong><small>先看孩子最愿意继续的事，不把四项都变成新目标。</small></span></div><Link to="/parent/assistant">{settings.enabled ? pending ? `查看 ${pending} 条待确认建议` : '整理一条下周建议' : '了解受控小队助手'}<Icon name="chevron" /></Link></aside>
  </section>
}
