/** Tiny in-memory TTL cache for hot, mostly-static reads (routes, stages, fares). */

const store = new Map()

function get(key) {
  const hit = store.get(key)
  if (!hit) return undefined
  if (Date.now() > hit.expires) {
    store.delete(key)
    return undefined
  }
  return hit.value
}

function set(key, value, ttlMs = 60_000) {
  store.set(key, { value, expires: Date.now() + ttlMs })
  if (store.size > 200) {
    const first = store.keys().next().value
    store.delete(first)
  }
}

function del(prefix) {
  for (const key of store.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`) || key.startsWith(prefix)) {
      store.delete(key)
    }
  }
}

function clear() {
  store.clear()
}

module.exports = { get, set, del, clear }
