import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBC7qg0f_IG-LYkVLqFzGBzDqJOL0P0c4w",
  authDomain: "calculadora-yeast.firebaseapp.com",
  projectId: "calculadora-yeast",
  storageBucket: "calculadora-yeast.appspot.com",
  messagingSenderId: "1161870708",
  appId: "1:1161870708:web:7a8f9c5a5b8c7d6e5f4g"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Habilitar persistencia offline
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('Múltiples pestañas abiertas; persistencia deshabilitada.')
  } else if (err.code === 'unimplemented') {
    console.log('Navegador no soporta persistencia offline.')
  }
})

// Autenticación anónima
signInAnonymously(auth).catch((error) => {
  console.error('Error en autenticación:', error)
})

export { auth, db }
