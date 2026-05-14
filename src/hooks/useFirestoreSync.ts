// src/hooks/useFirestoreSync.ts
import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase/config';
import { clearUserSession } from '../services/asyncStorage';
import { signOut } from 'firebase/auth';

export const useFirestoreSync = (navigation: any) => {
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen to user document in Firestore
    const userRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (!docSnapshot.exists()) {
        // User document was deleted from Firestore!
        console.log('User data deleted from Firestore - resetting app');
        
        // Clear local storage
        clearUserSession();
        
        // Sign out from Firebase
        signOut(auth);
        
        // Reset navigation to splash
        navigation.reset({
          index: 0,
          routes: [{ name: 'Splash' }],
        });
      }
    }, (error) => {
      console.error('Firestore listener error:', error);
    });

    return () => unsubscribe();
  }, [navigation]);
};