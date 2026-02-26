const VALID_ENVIRONMENTS = new Set(['production', 'staging', 'local'])

export const normalizeEnvironment = (value) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase()
  return VALID_ENVIRONMENTS.has(normalized) ? normalized : ''
}

export const parseHostnames = (value) => {
  if (typeof value !== 'string') return []
  return value
    .split(',')
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean)
}

const isLocalHostname = (hostname) => {
  if (!hostname) return false
  return (
    hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '0.0.0.0'
    || hostname.endsWith('.local')
  )
}

const isStagingHostname = (hostname, stagingHostnames = []) => {
  if (!hostname) return false
  if (stagingHostnames.includes(hostname)) return true
  return hostname.includes('staging')
}

export const detectHostEnvironment = (hostname, stagingHostnames = []) => {
  const normalizedHostname = typeof hostname === 'string'
    ? hostname.trim().toLowerCase()
    : ''

  if (isLocalHostname(normalizedHostname)) return 'local'
  if (isStagingHostname(normalizedHostname, stagingHostnames)) return 'staging'
  return 'production'
}

export const resolveRuntimeEnvironment = ({
  configuredEnvironment,
  hostname,
  stagingHostnames = []
} = {}) => {
  const hostEnvironment = detectHostEnvironment(hostname, stagingHostnames)
  const configured = normalizeEnvironment(configuredEnvironment)

  // Safety guard: local or staging hosts cannot resolve to production.
  if (hostEnvironment === 'local' || hostEnvironment === 'staging') {
    return hostEnvironment
  }

  return configured || hostEnvironment
}

export const resolveFirestoreNamespace = ({
  configuredNamespace,
  runtimeEnvironment,
  hostEnvironment
} = {}) => {
  const configured = normalizeEnvironment(configuredNamespace)
  const runtime = normalizeEnvironment(runtimeEnvironment) || 'production'

  // Safety guard: local or staging hosts cannot write into production namespace.
  if (hostEnvironment === 'local' || hostEnvironment === 'staging') {
    return hostEnvironment
  }

  return configured || runtime
}

const viteEnv = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env
  : {}

const stagingHostnames = parseHostnames(viteEnv.VITE_STAGING_HOSTNAMES)
const runtimeHostname = typeof window !== 'undefined' ? window.location.hostname : ''
const hostEnvironment = detectHostEnvironment(runtimeHostname, stagingHostnames)

export const appEnvironment = resolveRuntimeEnvironment({
  configuredEnvironment: viteEnv.VITE_APP_ENV,
  hostname: runtimeHostname,
  stagingHostnames
})

export const firestoreNamespace = resolveFirestoreNamespace({
  configuredNamespace: viteEnv.VITE_FIRESTORE_NAMESPACE,
  runtimeEnvironment: appEnvironment,
  hostEnvironment
})

export const environmentMeta = {
  appEnvironment,
  firestoreNamespace,
  hostEnvironment,
  runtimeHostname
}
