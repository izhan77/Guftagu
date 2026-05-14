// src/services/onboardingLogic.ts
import { auth, db } from './firebase/config';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { saveUserSession, getUserSession, generateAnonId, isSessionFullyOnboarded } from './asyncStorage';

// Helper: Ensure user is authenticated
const ensureAuthenticated = async () => {
  await auth.authStateReady();
  let user = auth.currentUser;
  if (!user) {
    const result = await signInAnonymously(auth);
    user = result.user;
  }
  return user;
};

// Parse age string to number
const parseAge = (ageString: string): number => {
  if (ageString === '14+') return 14;
  const match = ageString.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

// SCREEN 1: Age Gate - Save age consent
export const saveAgeConsent = async (ageGroup: string): Promise<{ needsParentConsent: boolean; age: number }> => {
  const user = await ensureAuthenticated();
  const age = parseAge(ageGroup);
  const needsParentConsent = age < 14;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const anonId = userSnap.exists() ? userSnap.data().anonId : generateAnonId();

  await setDoc(userRef, {
    uid: user.uid,
    anonId,
    age,
    ageGroup,
    ageConsent: true,
    parentConsent: !needsParentConsent,
    onboardingComplete: false,
    updatedAt: Timestamp.now(),
  }, { merge: true });

  await saveUserSession({
    uid: user.uid,
    anonId,
    age,
    ageGroup,
    parentConsent: !needsParentConsent,
    timestamp: Date.now(),
  });

  return { needsParentConsent, age };
};

// SCREEN 2: Parent Email & Math Challenge
export const requestParentConsent = async (parentEmail: string): Promise<{ consentId: string; mathQuestion: string }> => {
  const user = await ensureAuthenticated();
  
  // Generate math challenge
  const num1 = Math.floor(Math.random() * 20) + 10;
  const num2 = Math.floor(Math.random() * 20) + 10;
  const mathQuestion = `${num1} + ${num2}`;
  const mathAnswer = num1 + num2;

  // Create consent document in Firestore
  const consentRef = await addDoc(collection(db, 'consents'), {
    childUid: user.uid,
    parentEmail,
    mathQuestion,
    mathAnswer,
    status: 'pending',
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Update user document
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    pendingParentEmail: parentEmail,
    consentId: consentRef.id,
  });

  await saveUserSession({ parentEmail });

  return { consentId: consentRef.id, mathQuestion };
};

// SCREEN 3: Verify Parent Answer
export const verifyParentAnswer = async (consentId: string, answer: string): Promise<boolean> => {
  const user = await ensureAuthenticated();
  
  const consentRef = doc(db, 'consents', consentId);
  const consentSnap = await getDoc(consentRef);
  
  if (!consentSnap.exists()) return false;
  
  const data = consentSnap.data();
  const isCorrect = parseInt(answer, 10) === data.mathAnswer;
  
  if (!isCorrect) return false;
  
  // Update consent status
  await updateDoc(consentRef, { status: 'verified', verifiedAt: Timestamp.now() });
  
  // Update user document
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    parentConsent: true,
    parentEmail: data.parentEmail,
    consentVerifiedAt: Timestamp.now(),
  });
  
  await saveUserSession({ parentConsent: true });
  
  return true;
};

// SCREEN 4: Save Child Name
export const saveChildProfile = async (nickname: string): Promise<void> => {
  const user = await ensureAuthenticated();
  
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    nickname: nickname.trim(),
    onboardingComplete: true,
    updatedAt: Timestamp.now(),
  }, { merge: true });
  
  await saveUserSession({
    nickname: nickname.trim(),
    onboardingComplete: true,
  });
};

// Check onboarding status on app launch
export const checkUserOnboarding = async (): Promise<{ route: 'dashboard' | 'age-gate'; userData?: any }> => {
  const session = await getUserSession();
  
  if (session && isSessionFullyOnboarded(session)) {
    return { route: 'dashboard', userData: session };
  }
  
  return { route: 'age-gate' };
};

// Save session interaction (for analytics)
export const saveSessionInteraction = async (
  characterId: string,
  duration: number,
  transcript: any[]
): Promise<void> => {
  const user = await ensureAuthenticated();
  
  await addDoc(collection(db, 'sessions'), {
    childUid: user.uid,
    characterId,
    duration,
    transcript,
    createdAt: Timestamp.now(),
  });
};