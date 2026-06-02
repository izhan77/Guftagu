/**
 * User Data Types
 * Defines the shape of user documents in Firestore and AsyncStorage
 */

import { Timestamp } from 'firebase/firestore';

export interface UserData {
  // Authentication
  uid: string; // Firebase Auth UID
  anonId: string; // Anonymous identifier (for backup)

  // Onboarding
  onboardingComplete: boolean;
  age: number;
  ageConsent: boolean;
  parentConsent: boolean;
  nickname: string;

  // Parent Verification (COPPA)
  parentConsent?: boolean; // Explicitly confirmed by parent
  linkedParentId?: string; // Reference to parent document (if linked)

  // Character Progress
  chosenCharacter: string; // Current character ID ("zara", "robo", "ustad")
  characterBondLevel: number; // 0-100
  characterBondTier: string; // "New" | "Familiar" | "Trusted" | "Best Friend"
  lastKnownMood?: string; // Last detected mood from session

  // Learning Progress
  confidenceScore: number; // 0-100
  confidenceLevel: number; // 1-5
  sessionStreak: number; // Days of consecutive practice
  totalSessions: number; // Lifetime session count
  lastSessionDate?: Timestamp; // Date of most recent session

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * User Session Type for AsyncStorage
 * Lightweight version persisted locally for offline access
 */
export interface UserSession {
  email?: string; // optional, used for parent verification
  anonId: string;
  age: number;
  ageConsent: boolean;
  parentConsent: boolean;
  nickname: string;
  onboardingComplete: boolean;
  lastSessionScore?: number;
  lastSessionDate?: string; // ISO string
  lastCharacterId?: string;
}
