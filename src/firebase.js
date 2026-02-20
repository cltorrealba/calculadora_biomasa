import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDTF5sVhvpCuv74bquuVz2FfWyRr-46XwM",
  authDomain: "calculadora-yeast.firebaseapp.com",
  projectId: "calculadora-yeast",
  storageBucket: "calculadora-yeast.firebasestorage.app",
  messagingSenderId: "108683121725",
  appId: "1:108683121725:web:63cea1355bbb8a83858654"
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
