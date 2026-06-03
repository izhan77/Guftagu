// src/services/sessionService.ts
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, runTransaction } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import { getUserSession, saveUserSession } from './asyncStorage';
import { getLevel } from './scoring';

// ============================================================
// Types
// ============================================================

export interface ExchangeData {
  exchangeNumber: number;
  childTranscript: string;
  wordCount: number;
  fillerCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  characterResponse: string;
  exchangeScore: number;
  detectedMood?: string;
}

export interface SessionData {
  characterId: string;
  exchanges: ExchangeData[];
  totalDuration: number;  // in seconds
  moodStart?: string;
  moodEnd?: string;
  topics: string[];
}

// ============================================================
// Bond Helpers
// ============================================================

function calculateBondIncrease(sessionData: SessionData): number {
  const baseIncrease = 5;
  const lengthBonus = Math.min(10, Math.floor(sessionData.totalDuration / 60));
  const exchangeBonus = Math.min(8, sessionData.exchanges.length);
  return Math.min(20, baseIncrease + lengthBonus + exchangeBonus);
}

function getBondTier(bondLevel: number): string {
  if (bondLevel >= 80) return "Best Friend";
  if (bondLevel >= 50) return "Trusted";
  if (bondLevel >= 20) return "Familiar";
  return "New";
}

function calculateNewStreak(lastSessionDate: any, currentStreak: number): number {
  if (!lastSessionDate) return 1;
  
  const lastDate = lastSessionDate.toDate();
  const today = new Date();
  
  // Reset time to start of day for accurate comparison
  lastDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    // Yesterday → streak increases
    return currentStreak + 1;
  } else if (diffDays === 0) {
    // Today already → streak stays same
    return currentStreak;
  } else {
    // More than 1 day gap → streak resets to 1
    return 1;
  }
}

// ============================================================
// Main Session Saving Function
// ============================================================
// Persists a completed child session and updates score, streak, and character bond progress.
export async function saveCompleteSession(...)
export async function saveCompleteSession(sessionData: SessionData): Promise<{
  sessionScore: number;
  newOverallScore: number;
  leveledUp: boolean;
}> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user – cannot save session');
  }

  // 1. Calculate session score
  const exchangeScores = sessionData.exchanges.map(e => e.exchangeScore);
  const sessionScore = exchangeScores.reduce((a, b) => a + b, 0) / exchangeScores.length;
  const roundedSessionScore = Math.round(sessionScore);

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  const currentScore = userData?.confidenceScore ?? 50;
  const currentBond = userData?.characterBondLevel ?? 0;
  const currentStreak = userData?.sessionStreak ?? 0;
  const lastSessionDate = userData?.lastSessionDate ?? null;

  // 2. Calculate new overall score
  const newOverallScore = Math.round(currentScore * 0.65 + roundedSessionScore * 0.35);

  // 3. Get level strings (FIXED: getLevel returns object with .level property)
  const oldLevelObj = getLevel(currentScore);
  const newLevelObj = getLevel(newOverallScore);
  const leveledUp = oldLevelObj.level !== newLevelObj.level;

  // 4. Calculate new bond level
  const bondIncrease = calculateBondIncrease(sessionData);
  const newBondLevel = Math.min(100, currentBond + bondIncrease);
  const newBondTier = getBondTier(newBondLevel);

  // 5. Calculate new streak
  const newStreak = calculateNewStreak(lastSessionDate, currentStreak);

  console.log("Current user UID:", auth.currentUser?.uid);
console.log("Child UID being saved:", user.uid);
console.log("Are they the same?", auth.currentUser?.uid === user.uid);
  // 6. Run Firestore transaction
  await runTransaction(db, async (transaction) => {
    // Update user document
    transaction.update(userRef, {
      confidenceScore: newOverallScore,
      confidenceLevel: newLevelObj.level,  // FIXED: use .level property
      sessionStreak: newStreak,
      totalSessions: (userData?.totalSessions || 0) + 1,
      lastSessionDate: Timestamp.now(),
      characterBondLevel: newBondLevel,
      characterBondTier: newBondTier,
      updatedAt: Timestamp.now(),
      ...(sessionData.moodEnd && { lastKnownMood: sessionData.moodEnd }),
    });

    // Create session document
    const sessionRef = doc(collection(db, 'sessions'));
    transaction.set(sessionRef, {
      childUid: user.uid,
      characterId: sessionData.characterId,
      sessionDate: Timestamp.now(),
      sessionDuration: sessionData.totalDuration,
      exchangeCount: sessionData.exchanges.length,
      exchanges: sessionData.exchanges.map(e => ({
        exchangeNumber: e.exchangeNumber,
        childTranscript: e.childTranscript,
        wordCount: e.wordCount,
        fillerCount: e.fillerCount,
        sentenceCount: e.sentenceCount,
        avgSentenceLength: e.avgSentenceLength,
        characterResponse: e.characterResponse,
        exchangeScore: e.exchangeScore,
        timestamp: Timestamp.now(),
        detectedMood: e.detectedMood || null,
      })),
      sessionScore: roundedSessionScore,
      confidenceDelta: newOverallScore - currentScore,
      preSessionScore: currentScore,
      postSessionScore: newOverallScore,
      moodStart: sessionData.moodStart || null,
      moodEnd: sessionData.moodEnd || null,
      topics: sessionData.topics,
      audioDeleted: true,
      audioDeletedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
  });

  // 7. Update local AsyncStorage
  const localSession = await getUserSession();
  await saveUserSession({
    ...localSession,
    lastSessionScore: roundedSessionScore,
    lastSessionDate: new Date().toISOString(),
  });

  return {
    sessionScore: roundedSessionScore,
    newOverallScore,
    leveledUp,
  };
}