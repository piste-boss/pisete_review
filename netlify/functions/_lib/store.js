import { getStore } from '@netlify/blobs'

const DEFAULT_STORE_NAME = 'nakotakasu-review-config'
const memoryStore = new Map()

const resolveStoreName = (name) => {
  if (name) return name
  if (process.env.NETLIFY_BLOBS_STORE) return process.env.NETLIFY_BLOBS_STORE
  if (process.env.BLOBS_STORE_NAME) return process.env.BLOBS_STORE_NAME
  return DEFAULT_STORE_NAME
}

const getCredentials = () => {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.BLOBS_SITE_ID
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.BLOBS_TOKEN

  if (!siteID && !token) {
    return null
  }

  return { siteID, token }
}

const createMemoryStore = () => ({
  async get(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null
  },
  async set(key, value) {
    memoryStore.set(key, value)
    return { key }
  },
  async delete(key) {
    memoryStore.delete(key)
  },
})

export const createStore = (name, context) => {
  const storeName = resolveStoreName(name)
  if (context?.netlify?.blobs?.getStore) {
    return context.netlify.blobs.getStore({ name: storeName })
  }

  const credentials = getCredentials()
  if (credentials) {
    try {
      return getStore({
        name: storeName,
        ...credentials,
      })
    } catch (error) {
      console.warn('Blobs store initialization failed, falling back to memory store:', error?.message)
      return createMemoryStore()
    }
  }
  try {
    return getStore({ name: storeName })
  } catch (error) {
    console.warn('Blobs store unavailable, using in-memory store:', error?.message)
    return createMemoryStore()
  }
}

export const getConfigStore = (context) => createStore(undefined, context)
