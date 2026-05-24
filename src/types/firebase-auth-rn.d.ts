/**
 * React Native persistence is implemented in @firebase/auth's RN bundle but
 * omitted from the web-oriented `firebase/auth` typings. Metro still resolves it at runtime.
 */
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: import('@react-native-async-storage/async-storage').default
  ): Persistence;
}