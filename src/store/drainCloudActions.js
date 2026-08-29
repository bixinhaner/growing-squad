export async function drainCloudActions({ readItems, writeItems, getToken, sendAction, sendBatch, cursor = 0, batchSize = 100 }) {
  let latestPayload = null
  let latestCursor = Number(cursor) || 0
  const conflicts = []
  while (readItems().length) {
    const first = readItems()[0]
    const token = getToken(first)
    if (!token) return { status: 'needs-parent', payload: latestPayload }
    if (!sendBatch) {
      latestPayload = await sendAction(first, token)
      writeItems(readItems().slice(1))
      continue
    }
    const requiresParent = Boolean(first.requiresParent)
    const batch = readItems().filter((item, index, items) => index < batchSize && items.slice(0, index + 1).every((candidate) => Boolean(candidate.requiresParent) === requiresParent))
    latestPayload = await sendBatch(batch, latestCursor, token)
    latestCursor = Number(latestPayload.cursor || latestCursor)
    const accepted = new Set((latestPayload.accepted || []).map((item) => item.id))
    const rejected = new Map((latestPayload.rejected || []).map((item) => [item.id, item]))
    const completedIds = new Set([...accepted, ...rejected.keys()])
    for (const item of batch) {
      const rejection = rejected.get(item.id)
      if (rejection?.status === 409 || rejection?.status === 428) conflicts.push({ id: item.id, item, rejection, createdAt: Date.now() })
    }
    writeItems(readItems().filter((item) => !completedIds.has(item.id)))
    if (!completedIds.size) throw new Error('云端没有确认本批操作，请稍后重试。')
  }
  return { status: conflicts.length ? 'conflict' : 'saved', payload: latestPayload, cursor: latestCursor, conflicts }
}
