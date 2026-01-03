// Shim for node-fetch
// This ensures we always use the built-in fetch in React Native
const fetchShim = (...args) => globalThis.fetch(...args)

export default fetchShim
