import { describe, expect, it } from 'vitest'
import { inventorReducer } from './inventorReducer.js'
import { activeInventorProject, projectArtifacts, projectStory } from './inventorModel.js'

const base = {
  profiles: [{ id: 'kid-1', name: '小语' }],
  modules: { inventor: { version: 1, projects: [], artifacts: {}, knowledgeCards: [] } },
  growth: { moments: [], world: {}, collections: [] },
  meta: {},
}

const op = (type, payload, occurredAt = 100) => ({ type, payload, occurredAt, target: { profileId: 'kid-1' } })

describe('inventor workshop', () => {
  it('keeps a complete problem-to-iteration story without scores or failure labels', () => {
    const project = {
      id: 'project-hair-robot',
      seedId: 'hair-robot',
      title: '洗头机器人',
      problem: '洗头时水会进眼睛',
      helpsWho: ['我自己'],
      status: 'sketching',
      versions: [{ number: 1, idea: '先做一个挡住前面的版本', artifactIds: [] }],
    }
    let state = inventorReducer(base, op('inventor.project.created', { projectId: project.id, project }))
    state = inventorReducer(state, op('inventor.artifact.added', { projectId: project.id, versionNumber: 1, artifact: { id: 'photo-v1', projectId: project.id, kind: 'photo', fileName: '第一版.webp', stage: 'prototype_1' } }, 110))
    state = inventorReducer(state, op('inventor.project.stage-updated', { projectId: project.id, status: 'testing' }, 120))
    state = inventorReducer(state, op('inventor.test.recorded', { projectId: project.id, finding: 'side-leaks', findingTitle: '两边还会漏', nextChange: 'wrap-sides', nextChangeTitle: '把两边围起来', nextQuestion: '怎样挡住两边的水？' }, 130))
    state = inventorReducer(state, op('inventor.knowledge.added', { projectId: project.id, cardId: 'wraparound' }, 140))
    state = inventorReducer(state, op('inventor.iteration.created', { projectId: project.id, idea: '让挡水边绕到两侧' }, 150))
    state = inventorReducer(state, op('inventor.project.stage-updated', { projectId: project.id, status: 'showcase' }, 160))

    const current = activeInventorProject(state, 'kid-1')
    expect(current.status).toBe('showcase')
    expect(current.versions).toHaveLength(2)
    expect(current.versions[0].testFindingTitle).toBe('两边还会漏')
    expect(current.knowledgeCardIds).toEqual(['wraparound'])
    expect(projectArtifacts(state, project.id).map((item) => item.id)).toEqual(['photo-v1'])
    expect(projectStory(current).map((item) => item.title)).toEqual(['我发现的麻烦', '第一版怎么想', '测试告诉我', '第二版这样改'])
    expect(state.growth.world['kid-1'].workshopObjects.map((item) => item.itemId)).toEqual(['workbench', 'gear'])
    expect(state.growth.moments.map((item) => item.type)).toEqual(['inventor.prototype-created', 'inventor.iteration-created'])
    expect(JSON.stringify(state)).not.toMatch(/score|rank|points|失败|积分|排名/)
  })

  it('archives a project without deleting its versions, evidence or family notes', () => {
    const project = { id: 'project-rain', title: '雨天书包保护罩', problem: '书包会淋湿', status: 'showcase', versions: [{ number: 1, artifactIds: [] }, { number: 2, artifactIds: [] }] }
    let state = inventorReducer(base, op('inventor.project.created', { projectId: project.id, project }))
    state = inventorReducer(state, op('inventor.parent-note.added', { projectId: project.id, noteId: 'note-1', text: '孩子说要让水往两边走' }, 200))
    state = inventorReducer(state, op('inventor.project.archived', { projectId: project.id }, 210))
    const archived = state.modules.inventor.projects[0]
    expect(archived.status).toBe('archived')
    expect(archived.versions).toHaveLength(2)
    expect(archived.parentNotes[0].text).toContain('孩子说')
    expect(activeInventorProject(state, 'kid-1')).toBeNull()
  })

  it('removes one media artifact without deleting the invention project', () => {
    const project = { id: 'project-media', title: '纸板机器', problem: '想帮忙', status: 'testing', versions: [{ number: 1, artifactIds: [], testArtifactIds: [] }] }
    let state = inventorReducer(base, op('inventor.project.created', { projectId: project.id, project }))
    state = inventorReducer(state, op('inventor.artifact.added', { projectId: project.id, versionNumber: 1, artifact: { id: 'photo-one', projectId: project.id, kind: 'photo' } }, 110))
    state = inventorReducer(state, op('inventor.artifact.deleted', { projectId: project.id, artifactId: 'photo-one' }, 120))
    expect(state.modules.inventor.artifacts['photo-one']).toBeUndefined()
    expect(state.modules.inventor.projects).toHaveLength(1)
    expect(state.modules.inventor.projects[0].versions[0].artifactIds).not.toContain('photo-one')
  })
})
