function ensureInventor(state) {
  const next = structuredClone(state)
  next.modules ||= {}
  next.modules.inventor = { version: 1, projects: [], artifacts: {}, knowledgeCards: [], ...(next.modules.inventor || {}) }
  next.modules.inventor.projects ||= []
  next.modules.inventor.artifacts ||= {}
  next.modules.inventor.knowledgeCards ||= []
  next.growth ||= { moments: [], world: {}, collections: [] }
  next.growth.moments ||= []
  next.growth.world ||= {}
  return next
}

function addWorkshopObject(next, profileId, projectId, itemId, occurredAt) {
  const world = next.growth.world[profileId] || {}
  const objects = world.workshopObjects || []
  if (objects.some((item) => item.projectId === projectId && item.itemId === itemId)) return
  next.growth.world[profileId] = { ...world, workshopObjects: [...objects, { id: `workshop:${projectId}:${itemId}`, projectId, itemId, createdAt: occurredAt }] }
}

export function inventorReducer(state, operation) {
  const next = ensureInventor(state)
  const module = next.modules.inventor
  const payload = operation.payload
  const profileId = operation.target.profileId
  const projectIndex = module.projects.findIndex((item) => item.id === payload.projectId)
  const project = projectIndex >= 0 ? module.projects[projectIndex] : null

  if (operation.type === 'inventor.project.created') {
    if (!module.projects.some((item) => item.id === payload.project.id)) module.projects.push({ ...payload.project, profileId, status: payload.project.status || 'sketching', versions: payload.project.versions || [{ number: 1, idea: '先做一个能试的版本', artifactIds: [] }], createdAt: operation.occurredAt, updatedAt: operation.occurredAt })
  } else if (project && operation.type === 'inventor.project.stage-updated') {
    const previousStatus = project.status
    module.projects[projectIndex] = { ...project, status: payload.status, updatedAt: operation.occurredAt }
    if (payload.status === 'testing' && previousStatus !== 'testing') {
      addWorkshopObject(next, profileId, project.id, 'workbench', operation.occurredAt)
      if (!next.growth.moments.some((item) => item.id === `inventor:first:${project.id}`)) next.growth.moments.push({ id: `inventor:first:${project.id}`, type: 'inventor.prototype-created', sourceModule: 'inventor', profileId, projectId: project.id, title: `${project.title}有了第一版`, createdAt: operation.occurredAt })
    }
    if (payload.status === 'showcase' && previousStatus !== 'showcase') {
      addWorkshopObject(next, profileId, project.id, 'gear', operation.occurredAt)
      if (!next.growth.moments.some((item) => item.id === `inventor:second:${project.id}`)) next.growth.moments.push({ id: `inventor:second:${project.id}`, type: 'inventor.iteration-created', sourceModule: 'inventor', profileId, projectId: project.id, title: `${project.title}带着线索改了第二版`, createdAt: operation.occurredAt })
    }
  } else if (operation.type === 'inventor.artifact.added') {
    const artifact = { ...payload.artifact, profileId, status: payload.artifact.status || 'local', createdAt: operation.occurredAt, updatedAt: operation.occurredAt }
    module.artifacts[artifact.id] ||= artifact
    if (project) {
      const versions = project.versions.map((version) => version.number === Number(payload.versionNumber || 1) ? { ...version, artifactIds: [...new Set([...(version.artifactIds || []), artifact.id])] } : version)
      module.projects[projectIndex] = { ...project, versions, updatedAt: operation.occurredAt }
    }
  } else if (operation.type === 'inventor.artifact.synced') {
    if (module.artifacts[payload.artifactId]) module.artifacts[payload.artifactId] = { ...module.artifacts[payload.artifactId], status: 'synced', remote: true, updatedAt: operation.occurredAt }
  } else if (project && operation.type === 'inventor.test.recorded') {
    const versions = project.versions.map((version) => version.number === 1 ? { ...version, testFinding: payload.finding, testFindingTitle: payload.findingTitle, testArtifactIds: payload.artifactIds || version.testArtifactIds || [] } : version)
    module.projects[projectIndex] = { ...project, versions, status: 'learning', nextQuestion: payload.nextQuestion, nextChange: payload.nextChange, nextChangeTitle: payload.nextChangeTitle, updatedAt: operation.occurredAt }
  } else if (project && operation.type === 'inventor.knowledge.added') {
    module.projects[projectIndex] = { ...project, knowledgeCardIds: [...new Set([...(project.knowledgeCardIds || []), payload.cardId])], updatedAt: operation.occurredAt }
  } else if (project && operation.type === 'inventor.iteration.created') {
    const existing = project.versions.find((item) => item.number === 2)
    const versions = existing ? project.versions.map((item) => item.number === 2 ? { ...item, idea: payload.idea } : item) : [...project.versions, { number: 2, idea: payload.idea, artifactIds: [] }]
    module.projects[projectIndex] = { ...project, status: 'iteration', versions, updatedAt: operation.occurredAt }
  } else if (project && operation.type === 'inventor.showcase.method-selected') {
    module.projects[projectIndex] = { ...project, showcase: { ...(project.showcase || {}), method: payload.method, updatedAt: operation.occurredAt }, updatedAt: operation.occurredAt }
  } else if (project && operation.type === 'inventor.parent-note.added') {
    module.projects[projectIndex] = { ...project, parentNotes: [...(project.parentNotes || []), { id: payload.noteId, text: payload.text, createdAt: operation.occurredAt }], updatedAt: operation.occurredAt }
  } else if (project && operation.type === 'inventor.project.archived') {
    module.projects[projectIndex] = { ...project, status: 'archived', archivedAt: operation.occurredAt, updatedAt: operation.occurredAt }
  }

  next.meta = { ...(next.meta || {}), updatedAt: operation.occurredAt }
  return next
}
