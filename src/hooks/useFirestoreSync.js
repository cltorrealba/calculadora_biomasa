import { useState, useCallback } from 'react'
import { db } from '../firebase'
import { doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, deleteDoc } from 'firebase/firestore'

const SESSION_DOC = 'current-session'
const GLOBAL_HISTORY_COLLECTION = 'shared-history' // Colección global compartida

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

  // Guardar en colección global compartida
  const addToHistory = async (record) => {
    try {
      const historyRef = doc(db, GLOBAL_HISTORY_COLLECTION, record.id.toString())
      await setDoc(historyRef, {
        ...record,
        createdAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('Error agregando al historial:', error)
      throw error
    }
  }

  // Suscribirse a la colección global (memoizado para evitar re-suscripciones)
  const subscribeToHistory = useCallback((callback) => {
    const q = query(collection(db, GLOBAL_HISTORY_COLLECTION), orderBy('createdAt', 'desc'))
    
    return onSnapshot(
      q,
      (snapshot) => {
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        callback(history)
      },
      (error) => console.error('Error en listener de historial:', error)
    )
  }, [])

  // Eliminar registro del historial
  const deleteFromHistory = async (recordId) => {
    try {
      await deleteDoc(doc(db, GLOBAL_HISTORY_COLLECTION, recordId.toString()))
      return true
    } catch (error) {
      console.error('Error eliminando registro:', error)
      throw error
    }
  }

  return { saveSession, loadSession, addToHistory, subscribeToHistory, deleteFromHistory, setIsSynced }
}
