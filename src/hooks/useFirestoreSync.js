import { useState } from 'react'
import { db } from '../firebase'
import { doc, setDoc, getDoc, onSnapshot, collection, query, orderBy } from 'firebase/firestore'

const SESSION_DOC = 'current-session'
const HISTORY_COLLECTION = 'history'

// Hook para sincronizar estado con Firestore
export const useFirestoreSync = (userId) => {
  const [isSynced, setIsSynced] = useState(false)

  const saveSession = async (sessionData) => {
    try {
      if (!userId) return
      const docRef = doc(db, 'users', userId, 'sessions', SESSION_DOC)
      await setDoc(docRef, {
        ...sessionData,
        lastUpdated: new Date().toISOString()
      }, { merge: true })
    } catch (error) {
      console.error('Error guardando sesión:', error)
    }
  }

  const loadSession = async () => {
    try {
      if (!userId) return null
      const docRef = doc(db, 'users', userId, 'sessions', SESSION_DOC)
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? docSnap.data() : null
    } catch (error) {
      console.error('Error cargando sesión:', error)
      return null
    }
  }

  const addToHistory = async (record) => {
    try {
      if (!userId) return
      const historyRef = doc(db, 'users', userId, 'history', Date.now().toString())
      await setDoc(historyRef, {
        ...record,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error agregando al historial:', error)
    }
  }

  const subscribeToHistory = (callback) => {
    if (!userId) return () => {}
    const collectionRef = `users/${userId}/history`
    const q = collection(db, collectionRef)
    
    return onSnapshot(
      query(q, orderBy('timestamp', 'desc')),
      (snapshot) => {
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        callback(history)
      },
      (error) => console.error('Error en listener de historial:', error)
    )
  }

  return { saveSession, loadSession, addToHistory, subscribeToHistory, setIsSynced }
}
