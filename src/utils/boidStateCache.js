const store = new Map()

export function getBoidState(key, initFn) {
  if (!store.has(key)) store.set(key, initFn())
  return store.get(key)
}

export function setBoidState(key, state) {
  store.set(key, state)
}
