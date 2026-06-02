import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, runTransaction } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import { getUserSession, saveUserSession } from './asyncStorage';
import { getLevel } from './scoring';
import { ExchangeData, SessionData } from '../types/session';

// Re-export types for backward compatibility
export { ExchangeData, SessionData };

// ============================================================
// Bond Helpers (simple Phase 1 logic)
// ============================================================

/**
 * Calculate how much bond level increases after a session.
 * - Base: +5
 * - Length bonus: +1 per full minute (max +10)
 * - Exchange bonus: +1 per exchange (max +8)
 * - Total capped at +20 per session.
 */
function calculateBondIncrease(sessionData: SessionData): number {
  const baseIncrease = 5;
  const lengthBonus = Math.min(10, Math.floor(sessionData.totalDuration / 60));
  const exchangeBonus = Math.min(8, sessionData.exchanges.length);
  return Math.min(20, baseIncrease + lengthBonus + exchangeBonus);
}

/**
 * Convert numeric bond level to a human‑readable tier.
 */
function getBondTier(bondLevel: number): string {
  if (bondLevel >= 80) return "Best Friend";
  if (bondLevel >= 50) return "Trusted";
  if (bondLevel >= 20) return "Familiar";
  return "New";
}

/**
 * Calculate new session streak based on last session date.
 * - If last session was yesterday → streak +1
 * - If last session is today → streak unchanged (already practiced)
 * - Otherwise → streak resets to 1
 */
function incrementStreak(lastSessionDate: any): number {
  if (!lastSessionDate) return 1;
  const lastDate = lastSessionDate.toDate();
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 1;   // +1 will be applied by adding to existing streak
  if (diffDays === 0) return 0;   // streak unchanged
  return -999;                    // signal to reset to 1
}

// ============================================================
// Main Session Saving Function (Firestore Transaction)
// ============================================================

export async function saveCompleteSession(sessionData: SessionData): Promise<{
  sessionScore: number;
  newOverallScore: number;
  leveledUp: boolean;
}> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user – cannot save session');
  }

  // 1. Calculate session score from individual exchange scores
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

  // 2. Calculate new overall confidence score (65% old, 35% session)
  const newOverallScore = Math.round(currentScore * 0.65 + roundedSessionScore * 0.35);

  // 3. Determine if leveled up
  const oldLevel = getLevel(currentScore).level;
  const newLevel = getLevel(newOverallScore).level;
  const leveledUp = oldLevel !== newLevel;

  // 4. Calculate new bond level
  const bondIncrease = calculateBondIncrease(sessionData);
  const newBondLevel = Math.min(100, currentBond + bondIncrease);
  const newBondTier = getBondTier(newBondLevel);

  // 5. Calculate new streak
  let newStreak = currentStreak;
  const streakDelta = incrementStreak(lastSessionDate);
  if (streakDelta === -999) {
    newStreak = 1;
  } else {
    newStreak = currentStreak + streakDelta;
  }

  // 6. Run Firestore transaction
  await runTransaction(db, async (transaction) => {
    // 6a. Update user document
    const updates: any = {
      confidenceScore: newOverallScore,
      confidenceLevel: newLevel.level,
      sessionStreak: newStreak,
      totalSessions: (userData?.totalSessions || 0) + 1,
      lastSessionDate: Timestamp.now(),
      characterBondLevel: newBondLevel,
      characterBondTier: newBondTier,
      updatedAt: Timestamp.now(),
    };
    if (sessionData.moodEnd) {
      updates.lastKnownMood = sessionData.moodEnd;
    }
    transaction.update(userRef, updates);

    // 6b. Create session document (COPPA compliant – no audio, only transcripts)
    const sessionRef = doc(collection(db, 'sessions'));
    transaction.set(sessionRef, {
      childUid: user.uid,
      characterId: sessionData.characterId,
      sessionDate: Timestamp.now(),
      sessionDuration: sessionData.totalDuration,   // seconds
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
      // COPPA compliance: explicitly mark that audio was never stored
      audioDeleted: true,
      audioDeletedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
  });

  // 7. Update local AsyncStorage (for offline/dashboard fast access)
  const localSession = await getUserSession();
  await saveUserSession({
    ...localSession,
    lastSessionScore: roundedSessionScore,
    lastSessionDate: new Date().toISOString(),
    lastCharacterId: sessionData.characterId,
  });

  return {
    sessionScore: roundedSessionScore,
    newOverallScore,
    leveledUp,
  };
}