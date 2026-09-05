import { dayTypeFor, getSchedule, localDateKey, timeToMinutes } from '../../domain/model.js'
import { todayDecisionsFor } from '../today/todayDecisions.js'
import { unresolvedHelpFor } from '../activity/activitySelectors.js'
export const REMINDER_PRIORITIES = { help:100, bedtime:70, resume:40, suggestion:10 }
function isQuietMinute(minute, start=1320, end=420) { return start>end ? minute>=start || minute<end : minute>=start && minute<end }
export function deriveReminderCandidates(state,current=new Date()) {
  const dateKey=localDateKey(current,0), minute=current.getHours()*60+current.getMinutes(), candidates=[]
  for (const profile of state.profiles || []) {
    const schedule=getSchedule(state,dayTypeFor(current),dateKey,profile.id)
    const bedtimeMinute=(timeToMinutes(schedule.prepareTime)-Number(schedule.reminderMinutes || 30)+1440)%1440
    if (schedule.reminderEnabled!==false && minute===bedtimeMinute) candidates.push({id:`bedtime:${profile.id}:${dateKey}:${bedtimeMinute}`,profileId:profile.id,kind:'bedtime',priority:70,title:`晚上好，${profile.name}`,body:`还有 ${schedule.reminderMinutes} 分钟开始准备，成长伙伴在等你。`,url:'/bedtime/tonight'})
    for (const request of unresolvedHelpFor(state,profile.id)) candidates.push({id:`help:${profile.id}:${request.id}:${request.at}`,profileId:profile.id,kind:'help',priority:100,title:`${profile.name}需要陪一下`,body:request.title,url:`/bedtime${request.route}`})
    const level=Number(state.scaffold?.states?.[`${profile.id}:today.start`]?.level ?? 2)
    for (const d of todayDecisionsFor(state,profile.id,dateKey)) {
      const elapsed=current.getTime()-Number(d.laterUntil)
      if (d.laterUntil && !d.completedAt && !d.skippedAt && elapsed>=0 && elapsed<60000 && level<3) candidates.push({id:`resume:${profile.id}:${dateKey}:${d.routineId || 'legacy'}:${d.laterUntil}`,profileId:profile.id,kind:'resume',priority:40,title:'想再看看刚才的小行动吗？',body:'可以继续，也可以今天先不做。',url:'/bedtime/today'})
    }
  }
  return candidates.filter((c) => c.kind==='help' || !isQuietMinute(minute)).sort((a,b) => b.priority-a.priority)
}
export function selectReminderCandidates(candidates,sentIds=new Set(),limit=3) {
  const kinds=new Set()
  return candidates.filter((c) => { if(sentIds.has(c.id)) return false; const key=`${c.profileId}:${c.kind}`; if(kinds.has(key)) return false; kinds.add(key); return true }).slice(0,limit)
}
