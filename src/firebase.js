import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

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

// Usar la nueva API de persistencia (reemplaza enableIndexedDbPersistence deprecado)
// Soporta múltiples pestañas sin conflictos
let db
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  })
} catch (err) {
  // Fallback: si ya fue inicializado o persistencia no disponible
  db = getFirestore(app)
  console.warn('Usando Firestore sin persistencia mejorada:', err.message)
}

// Autenticación anónima
signInAnonymously(auth).catch((error) => {
  console.error('Error en autenticación:', error)
})

export { auth, db }
