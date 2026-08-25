export async function drainCloudActions({ readItems, writeItems, getToken, sendAction }) {
  let latestPayload = null
  while (readItems().length) {
    const item = readItems()[0]
    const token = getToken(item)
    if (!token) return { status: 'needs-parent', payload: latestPayload }
    latestPayload = await sendAction(item, token)
    writeItems(readItems().slice(1))
  }
  return { status: 'saved', payload: latestPayload }
}
