import { useState, useCallback } from 'react'
import { db, buildNamespacedSegments } from '../firebase'
import { doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, deleteDoc } from 'firebase/firestore'

const SESSION_DOC = 'current-session'
const GLOBAL_HISTORY_COLLECTION = 'shared-history'
const historyCollectionPath = buildNamespacedSegments(GLOBAL_HISTORY_COLLECTION)

const getUserSessionPath = (userId) => (
  buildNamespacedSegments('users', userId, 'sessions', SESSION_DOC)
)

export const useFirestoreSync = (userId) => {
  const [isSynced, setIsSynced] = useState(false)

  const saveSession = async (sessionData) => {
    try {
      if (!userId) return
      const docRef = doc(db, ...getUserSessionPath(userId))
      await setDoc(docRef, {
        ...sessionData,
        lastUpdated: new Date().toISOString()
      }, { merge: true })
    } catch (error) {
      console.error('Error saving session:', error)
    }
  }

  const loadSession = async () => {
    try {
      if (!userId) return null
      const docRef = doc(db, ...getUserSessionPath(userId))
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? docSnap.data() : null
    } catch (error) {
      console.error('Error loading session:', error)
      return null
    }
  }

  const addToHistory = async (record) => {
    try {
      const historyRef = doc(db, ...historyCollectionPath, record.id.toString())
      await setDoc(historyRef, {
        ...record,
        createdAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('Error adding history record:', error)
      throw error
    }
  }

  const subscribeToHistory = useCallback((callback) => {
    const q = query(
      collection(db, ...historyCollectionPath),
      orderBy('createdAt', 'desc')
    )

    return onSnapshot(
      q,
      (snapshot) => {
        const history = snapshot.docs.map((historyDoc) => ({
          id: historyDoc.id,
          ...historyDoc.data()
        }))
        callback(history)
      },
      (error) => console.error('Error listening to history:', error)
    )
  }, [])

  const deleteFromHistory = async (recordId) => {
    try {
      await deleteDoc(doc(db, ...historyCollectionPath, recordId.toString()))
      return true
    } catch (error) {
      console.error('Error deleting history record:', error)
      throw error
    }
  }

  return { saveSession, loadSession, addToHistory, subscribeToHistory, deleteFromHistory, setIsSynced, isSynced }
}
