import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'
import { appEnvironment, firestoreNamespace } from './lib/environment'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

let db
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  })
} catch (err) {
  db = getFirestore(app)
  console.warn('Using Firestore without enhanced persistence:', err.message)
}

signInAnonymously(auth).catch((error) => {
  console.error('Authentication error:', error)
})

const FIRESTORE_ROOT_SEGMENTS = ['environments', firestoreNamespace]

const buildNamespacedSegments = (...segments) => [
  ...FIRESTORE_ROOT_SEGMENTS,
  ...segments
]

if (import.meta.env.DEV) {
  console.info('[firebase] environment:', appEnvironment, '| namespace:', firestoreNamespace)
}

export {
  auth,
  db,
  appEnvironment,
  firestoreNamespace,
  FIRESTORE_ROOT_SEGMENTS,
  buildNamespacedSegments
}
