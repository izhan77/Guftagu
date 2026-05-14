// src/types/firebase-auth.d.ts
declare module 'firebase/auth' {
  import type { Persistence } from 'firebase/auth';
  import type AsyncStorage from '@react-native-async-storage/async-storage';
  
  export function getReactNativePersistence(
    storage: typeof AsyncStorage
  ): Persistence;
}