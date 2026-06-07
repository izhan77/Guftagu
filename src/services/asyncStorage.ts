import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSession {
  email: string;
  anonId: string;
  timestamp: number;
  consentGiven: boolean;
  age?: number;
  ageConsent?: boolean;
  parentConsent?: boolean;
  nickname?: string;
  onboardingComplete?: boolean;
  lastSessionScore?: number;  
  lastSessionDate?: string;   
}

const SESSION_KEY = 'guftagu_user_session';

/**
 * Generate a unique anonymous ID 
 */
export const generateAnonId = (): string => {
  const timestamp = Date.now().toString(36);           // e.g. "lkq3f2a"
  const r1 = Math.random().toString(36).substring(2, 9); // 7 random chars
  const r2 = Math.random().toString(36).substring(2, 9); // 7 more
  return `child_${timestamp}_${r1}_${r2}`;             // e.g. "child_lkq3f2a_4g8xz1p_9mw2k7r"
};

/**
 * Save user session data to AsyncStorage
 */
export const saveUserSession = async (
  sessionData: Partial<UserSession>
): Promise<void> => {
  try {
    const existingSession = await getUserSession();
    const updatedSession: UserSession = {
      ...(existingSession ?? {}),
      ...sessionData,
      timestamp: sessionData.timestamp || Date.now(),
    } as UserSession;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
  } catch (error) {
    console.error('Error saving user session:', error);
    throw error;
  }
};

/**
 * Retrieve user session from AsyncStorage
 */
export const getUserSession = async (): Promise<UserSession | null> => {
  try {
    const session = await AsyncStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Error retrieving user session:', error);
    return null;
  }
};

/** True only when local session reflects a finished onboarding (not a partial write). */
export const isSessionFullyOnboarded = (
  session: UserSession | null
): boolean => {
  if (!session) return false;
  const nick = session.nickname?.trim() ?? '';
  return (
    session.onboardingComplete === true &&
    session.ageConsent === true &&
    nick.length >= 2  // ✅ Changed from > 2 to >= 2
  );
};
/**
 * Clear user session (sign out)
 */
export const clearUserSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Error clearing user session:', error);
    throw error;
  }
};

/**
 * Check if user session exists
 */
export const hasUserSession = async (): Promise<boolean> => {
  const session = await getUserSession();
  return session !== null;
};

/**
 * Get current timestamp
 */
export const getCurrentTimestamp = (): number => {
  return Date.now();
};

/**
 * Update specific fields in user session
 */
export const updateUserSession = async (
  updates: Partial<UserSession>
): Promise<void> => {
  const session = await getUserSession();
  if (!session) {
    throw new Error('No active user session');
  }
  await saveUserSession({ ...session, ...updates });
};