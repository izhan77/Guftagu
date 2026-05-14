// src/services/asyncStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSession {
  uid?: string;
  anonId: string;
  age?: number;
  ageGroup?: string;
  nickname?: string;
  parentEmail?: string;
  parentConsent?: boolean;
  onboardingComplete?: boolean;
  timestamp: number;
}

const SESSION_KEY = 'guftagu_user_session';

export const saveUserSession = async (sessionData: Partial<UserSession>): Promise<void> => {
  try {
    const existing = await getUserSession();
    const updated = { ...existing, ...sessionData, timestamp: Date.now() } as UserSession;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving session:', error);
  }
};

export const getUserSession = async (): Promise<UserSession | null> => {
  try {
    const session = await AsyncStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

export const clearUserSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};

export const generateAnonId = (): string => {
  return `child_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
};

export const isSessionFullyOnboarded = (session: UserSession | null): boolean => {
  if (!session) return false;
  return !!(
    session.onboardingComplete === true &&
    session.nickname &&
    session.nickname.length > 2 &&
    session.age !== undefined
  );
};