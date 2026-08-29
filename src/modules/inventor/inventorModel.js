import { INVENTOR_STAGES } from './inventorCatalog.js'

export function inventorState(state) {
  return { version: 1, projects: [], artifacts: {}, knowledgeCards: [], ...(state.modules?.inventor || {}) }
}

export function inventorProjects(state, profileId = state.activeProfileId) {
  return inventorState(state).projects.filter((item) => item.profileId === profileId).sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
}

export function inventorProject(state, projectId) {
  return inventorState(state).projects.find((item) => item.id === projectId) || null
}

export function activeInventorProject(state, profileId = state.activeProfileId) {
  return inventorProjects(state, profileId).find((item) => !['archived'].includes(item.status)) || null
}

export function projectArtifacts(state, projectId) {
  return Object.values(inventorState(state).artifacts).filter((item) => item.projectId === projectId).sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
}

export function stageIndex(status) {
  return Math.max(0, INVENTOR_STAGES.findIndex((item) => item.id === status))
}

export function nextInventorStage(status) {
  const index = stageIndex(status)
  return INVENTOR_STAGES[Math.min(INVENTOR_STAGES.length - 1, index + 1)].id
}

export function projectStory(project) {
  const first = project?.versions?.[0] || {}
  const second = project?.versions?.[1] || {}
  return [
    { title: '我发现的麻烦', copy: project?.problem || '还在观察生活里的小麻烦', image: 'problem' },
    { title: '第一版怎么想', copy: first.idea || '先做一个能试的版本', image: 'prototype-v1' },
    { title: '测试告诉我', copy: first.testFindingTitle || '试一试以后，把新线索记下来', image: 'testing' },
    { title: '第二版这样改', copy: second.idea || project?.nextChangeTitle || '带着线索再改一版', image: 'prototype-v2' },
  ]
}
