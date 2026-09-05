import { getScaffoldStates, getScaffoldSuggestion } from '../../core/scaffold/scaffoldEngine.js'
import { growthSummary, unresolvedHelpFor } from '../../core/activity/activitySelectors.js'
import { activeInventorProject } from '../inventor/inventorModel.js'
export const DEFAULT_ASSISTANT_SETTINGS = { enabled:false,childOneQuestion:false,externalUpload:false,scopes:{activitySummary:true,childQuotes:false,media:false} }
export function assistantState(state) { return {version:1,settingsByProfile:{},suggestions:{},reflections:{},...(state.modules?.assistant || {})} }
export function assistantSettings(state,profileId=state.activeProfileId) {
  const saved=assistantState(state).settingsByProfile[profileId] || {}
  return {...DEFAULT_ASSISTANT_SETTINGS,...saved,scopes:{...DEFAULT_ASSISTANT_SETTINGS.scopes,...saved.scopes}}
}
export function assistantSuggestions(state,profileId=state.activeProfileId) {
  return Object.values(assistantState(state).suggestions).filter((s) => s.profileId===profileId).sort((a,b) => Number(b.updatedAt)-Number(a.updatedAt))
}
export function buildWeeklyReport(state,profileId=state.activeProfileId,now=Date.now()) {
  const summary=growthSummary(state,profileId,now)
  const supportCount=unresolvedHelpFor(state,profileId).filter((r) => r.at>=summary.start && r.at<=summary.end).length
  const c=summary.counts
  return {start:summary.start,end:summary.end,total:summary.total,supportCount,
    headline:summary.total ? `这周留下了 ${summary.total} 个真实成长片段` : '这一周还在等第一个成长片段',
    subline:supportCount ? `有 ${supportCount} 个陪伴请求尚待回应。` : '完成不等于独立完成，记录不足时不作推断。',
    moments:[
      {id:'bedtime',title:'晚间节奏',value:c.bedtime,unit:'个夜晚',copy:'晚一点也不是失败。'},
      {id:'movement',title:'身体能量',value:c.movement,unit:'次活动',copy:'看见参与，不从按钮点击推断主动性。'},
      {id:'reading',title:'故事时光',value:c.reading,unit:'次阅读',copy:'听故事、一起读、自己读，都是参与。'},
      {id:'family',title:'一起生活',value:c.responsibility+c.inventor,unit:'个片段',copy:'共同完成分别记入参与孩子，发明记录的是进展。'},
      {id:'core',title:'日常小事',value:c.core,unit:'个片段',copy:'晨间和放学后的行动分别保存。'},
    ]}
}
export function buildAssistantSuggestions(state,profileId=state.activeProfileId) {
  const settings=assistantSettings(state,profileId)
  if (!settings.scopes.activitySummary) return [{id:`suggestion:${profileId}:private:${Math.floor(Date.now()/604800000)}`,kind:'activity',title:'让孩子自己选一件想继续的事',body:'当前没有读取活动摘要。这是一条通用建议：只问孩子想继续什么，不根据历史记录推断。',evidence:'通用建议 · 未读取活动记录'}]
  const scaffold=getScaffoldSuggestion(getScaffoldStates(state,profileId)), project=activeInventorProject(state,profileId), report=buildWeeklyReport(state,profileId)
  return [
    scaffold ? {id:`suggestion:${profileId}:scaffold:${scaffold.capabilityId}`,kind:'support',title:'可以和孩子商量少帮一步',body:scaffold.body,evidence:'来自明确记录了陪伴方式的观察'} : null,
    project ? {id:`suggestion:${profileId}:inventor:${project.id}`,kind:'knowledge',title:`把“${project.title}”做成一张发现卡`,body:'保留孩子测试时发现的线索，家长确认后再收进成长记录。',evidence:'来自发明家工坊的最近项目'} : null,
    {id:`suggestion:${profileId}:week:${Math.floor(Date.now()/604800000)}`,kind:'activity',title:report.total ? '选一个片段，让孩子讲给家里听' : '从一个五分钟小行动开始',body:report.total ? '不复盘对错，只问：“你最想留下哪一件事？”' : '让孩子自己从阅读、运动或家务里选一件，不设置完成排名。',evidence:'来自本周本地活动摘要'},
  ].filter(Boolean).slice(0,3)
}
export function childAssistantPrompt(state,profileId=state.activeProfileId) {
  const settings=assistantSettings(state,profileId)
  if (!settings.enabled || !settings.childOneQuestion) return null
  const project=settings.scopes.activitySummary ? activeInventorProject(state,profileId) : null
  if (project && ['learning','iteration','showcase'].includes(project.status)) return {id:`inventor:${project.id}:feeling`,eyebrow:'眠眠只问一个问题',question:`做“${project.title}”时，哪一刻最像小发明家？`,choices:[
    {id:'found',title:'发现新线索',copy:'我看见了以前没注意到的事'}, {id:'changed',title:'动手改一改',copy:'我让它比第一版更好用'}, {id:'shared',title:'讲给别人听',copy:'我能说出它为什么这样做'},
  ]}
  return {id:`week:${Math.floor(Date.now()/604800000)}:moment`,eyebrow:'眠眠只问一个问题',question:'今天哪件小事最想留在成长地图里？',choices:[
    {id:'started',title:'我自己开始了',copy:'没有一直等大人提醒'}, {id:'tried',title:'我愿意试一试',copy:'不一定成功，也有新发现'}, {id:'helped',title:'我帮助了家里',copy:'大家一起做更轻松'},
  ]}
}
