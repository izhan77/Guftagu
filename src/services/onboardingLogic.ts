import {
  signInAnonymously,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, Timestamp, deleteField, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../services/firebase/config';
import {
  saveUserSession,
  getUserSession,
  generateAnonId,
  getCurrentTimestamp,
  clearUserSession,
  UserSession,
  isSessionFullyOnboarded,
} from './asyncStorage';

export interface UserStatus {
  hasUser: boolean;
  hasAge: boolean;
  currentAge?: number;
  currentAgeGroup?: string;
  needsParentConsent?: boolean;
  parentConsentGiven?: boolean;
  hasNickname?: boolean;
}

export const getUserStatus = async (): Promise<UserStatus> => {
  try {
    await auth.authStateReady();
    const user = auth.currentUser;
    
    if (!user) {
      return { hasUser: false, hasAge: false };
    }
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      return { hasUser: true, hasAge: false };
    }
    
    const userData = userDocSnap.data();
    const age = userData.age;
    
    if (!age) {
      return { hasUser: true, hasAge: false };
    }
    
    // Convert age to ageGroup string
    let ageGroup = '14+';
    if (age <= 7) ageGroup = '6-7';
    else if (age <= 9) ageGroup = '8-9';
    else if (age <= 11) ageGroup = '10-11';
    else if (age <= 13) ageGroup = '12-13';
    
    return {
      hasUser: true,
      hasAge: true,
      currentAge: age,
      currentAgeGroup: ageGroup,
      needsParentConsent: age < 14 && !userData.parentConsent,
      parentConsentGiven: userData.parentConsent === true,
      hasNickname: !!(userData.nickname && userData.onboardingComplete === true),
    };
  } catch (error) {
    console.error('Error getting user status:', error);
    return { hasUser: false, hasAge: false };
  }
};


const ensureAuthenticated = async (): Promise<User> => {
  await auth.authStateReady();
  let user = auth.currentUser;
  if (!user) {
    const result = await signInAnonymously(auth);
    user = result.user;
  }
  return user;
};


export const checkUserOnboarding = async (): Promise<{
  route: 'dashboard' | 'age-gate';
  userData?: UserSession;
  user?: User;
}> => {
  try {
    const localSession = await getUserSession();
    if (localSession && isSessionFullyOnboarded(localSession)) {
      console.log(' User has completed onboarding (from AsyncStorage)');
      return { route: 'dashboard', userData: localSession };
    }
    console.log('Routing age-gate: local onboarding not complete (Firestore not used for cold route)');
    return { route: 'age-gate' };
  } catch (error) {
    console.error(' Error in checkUserOnboarding:', error);
    return { route: 'age-gate' };
  }
};

const parseAgeString = (ageString: string): number => {
  if (ageString === '14+') return 14;
  const match = ageString.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

export const saveAgeConsent = async (
  ageString: string
): Promise<{ needsParentConsent: boolean; age: number; wasOverridden: boolean }> => {
  try {
    // Ensure user is signed in
    await auth.authStateReady();
    let user = auth.currentUser;
    let wasOverridden = false;

    // If no user exists, create one
    if (!user) {
      console.log('No user found — signing in anonymously...');
      const result = await signInAnonymously(auth);
      user = result.user;
      console.log('Created new anonymous user:', user.uid);
    } else {
      // User exists → we are OVERRIDING their age
      wasOverridden = true;
      console.log('User exists, will OVERRIDE age:', user.uid);
    }

    const age = parseAgeString(ageString);
    const needsParentConsent = age < 14;

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    // Get existing data safely (no undefined)
    const existingData = userDocSnap.exists() ? userDocSnap.data() : null;
    
    // Get existing anonId or generate new one
    const anonId = existingData?.anonId || generateAnonId();
    
    // 🔥 CRITICAL FIX: Only include nickname if it exists (not undefined)
    const nicknameValue = existingData?.nickname || null;
    const onboardingCompleteValue = existingData?.onboardingComplete || false;
    
    // Build document data WITHOUT undefined values
    const docData: any = {
      uid: user.uid,
      anonId,
      age,
      ageConsent: true,
      parentConsent: !needsParentConsent,
      updatedAt: Timestamp.now(),
      createdAt: existingData?.createdAt || Timestamp.now(),
    };
    
    // Only add nickname if it has a value (not undefined, not null)
    if (nicknameValue) {
      docData.nickname = nicknameValue;
    }
    
    // Only add onboardingComplete if needed
    if (onboardingCompleteValue) {
      docData.onboardingComplete = onboardingCompleteValue;
    }
    
    // Only add totalSessions if exists
    if (existingData?.totalSessions !== undefined) {
      docData.totalSessions = existingData.totalSessions;
    }
    
    // Only add confidenceScore if exists
    if (existingData?.confidenceScore !== undefined) {
      docData.confidenceScore = existingData.confidenceScore;
    } else {
      docData.confidenceScore = 50; // Default
    }
    
    // Use setDoc with merge to OVERRIDE age but preserve other fields
    await setDoc(userDocRef, docData, { merge: true });

    // If age changed and parent consent was previously given but now needs re-consent
    if (wasOverridden && needsParentConsent) {
      const existingParentConsent = existingData?.parentConsent || false;
      const existingAge = existingData?.age || null;
      
      // If user changed from 14+ to under 14, reset parent consent
      if (existingAge && existingAge >= 14 && age < 14) {
        await updateDoc(userDocRef, {
          parentConsent: false,
          consentId: deleteField(),
          linkedParentId: deleteField(),
        });
        console.log('Age changed from 14+ to under 14 – reset parent consent');
      }
    }

    // Save to AsyncStorage
    const existingSession = await getUserSession();
    await saveUserSession({
      email: user.email || '',
      anonId,
      age,
      ageConsent: true,
      parentConsent: !needsParentConsent,
      timestamp: getCurrentTimestamp(),
      nickname: existingSession?.nickname || undefined,
    });

    console.log(`Age saved (${wasOverridden ? 'OVERRIDE' : 'NEW'}): age=${age}, needsParent=${needsParentConsent}`);

    return { needsParentConsent, age, wasOverridden };
  } catch (error) {
    console.error('Error saving age consent:', error);
    throw error;
  }
};

const generateMathChallenge = (): { problem: string; answer: number } => {
  const num1 = Math.floor(Math.random() * 30) + 10; // 10-40
  const num2 = Math.floor(Math.random() * 30) + 10; // 10-40
  const operations = ['+', '-'];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let problem: string;
  let answer: number;

  if (operation === '+') {
    problem = `${num1} + ${num2}`;
    answer = num1 + num2;
  } else {
    // Ensure subtraction doesn't result in negative
    problem = num1 > num2 ? `${num1} - ${num2}` : `${num2} - ${num1}`;
    answer = Math.abs(num1 - num2);
  }

  return { problem, answer };
};

export const requestParentConsent = async (
  parentEmail: string
): Promise<{ consentId: string; mathQuestion: string }> => {
  try {
    // Ensure user is signed in before writing to Firestore
    const user = await ensureAuthenticated();

    // Generate math challenge
    const { problem, answer } = generateMathChallenge();

    // Create a consent document in Firestore
    const consentDocRef = await addDoc(collection(db, 'consents'), {
      childUid: user.uid,
      parentEmail,
      mathQuestion: problem,
      mathAnswer: answer, // STORE SERVER-SIDE (not accessible from client)
      status: 'pending', // pending → verified
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    const consentId = consentDocRef.id;

    // Update user document with pending parent email
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      pendingParentEmail: parentEmail,
      consentId,
      updatedAt: Timestamp.now(),
    });

    // Save to AsyncStorage
    await saveUserSession({
      email: parentEmail,
      timestamp: getCurrentTimestamp(),
    });

    console.log(`Parent consent request created: consentId=${consentId}`);

    return {
      consentId,
      mathQuestion: problem,
    };
  } catch (error) {
    console.error(' Error requesting parent consent:', error);
    throw error;
  }
};

export const deleteParentEmailAfterVerification = async (consentId: string): Promise<void> => {
  const user = await ensureAuthenticated();
  
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    parentEmail: deleteField(),  // DELETES the email
    pendingParentEmail: deleteField(),  // DELETES pending email
    consentId: deleteField(),  // Optional: delete reference too
  });
  
  console.log('Parent email deleted from Firestore - COPPA compliant');
};

export const verifyParentAnswer = async (consentId: string, answer: string): Promise<boolean> => {
  const user = await ensureAuthenticated();
  
  const consentRef = doc(db, 'consents', consentId);
  const consentSnap = await getDoc(consentRef);
  
  if (!consentSnap.exists()) return false;
  
  const data = consentSnap.data();
  const isCorrect = parseInt(answer, 10) === data.mathAnswer;
  
  if (!isCorrect) return false;
  
  // Store parentEmail before it's deleted
  const parentEmail = data.parentEmail;
  
  // Update consent status
  await updateDoc(consentRef, { status: 'verified', verifiedAt: Timestamp.now() });
  
  // Update user document with parent consent
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    parentConsent: true,
    consentVerifiedAt: Timestamp.now(),
  });
  
  // Link child to parent (if email exists)
  if (parentEmail) {
    try {
      await linkChildToParent(parentEmail, user.uid);
      console.log(`Child ${user.uid} linked to parent email ${parentEmail}`);
    } catch (error) {
      console.error('Failed to link child to parent:', error);
      // Continue – child can still use app, but parent portal may not work
    }
  }
  
  // Delete sensitive data from child's document (COPPA)
  await updateDoc(userRef, {
    pendingParentEmail: deleteField(),
    consentId: deleteField(),
  });
  
  // Delete sensitive data from consent document
  await updateDoc(consentRef, {
    parentEmail: deleteField(),
    mathAnswer: deleteField(),
  });
  
  // Update local AsyncStorage
  await saveUserSession({ parentConsent: true });
  
  return true;
};

export const saveChildProfile = async (nickname: string): Promise<void> => {
  try {
    const user = await ensureAuthenticated();
    const trimmed = nickname.trim();

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const existingData = userDocSnap.exists() ? userDocSnap.data() : null;

    // Build document data WITHOUT undefined
    const docData: any = {
      uid: user.uid,
      nickname: trimmed,
      onboardingComplete: true,
      updatedAt: Timestamp.now(),
    };
    
    // Preserve existing fields if they exist
    if (existingData?.anonId) docData.anonId = existingData.anonId;
    if (existingData?.age) docData.age = existingData.age;
    if (existingData?.ageConsent !== undefined) docData.ageConsent = existingData.ageConsent;
    if (existingData?.parentConsent !== undefined) docData.parentConsent = existingData.parentConsent;
    if (existingData?.confidenceScore !== undefined) {
      docData.confidenceScore = existingData.confidenceScore;
    } else {
      docData.confidenceScore = 50;
    }
    if (existingData?.createdAt) docData.createdAt = existingData.createdAt;
    else docData.createdAt = Timestamp.now();

    await setDoc(userDocRef, docData, { merge: true });

    await saveUserSession({
      nickname: trimmed,
      onboardingComplete: true,
      timestamp: getCurrentTimestamp(),
    });

    console.log(`Child profile saved: nickname=${trimmed}`);
  } catch (error) {
    console.error('Error saving child profile:', error);
    throw error;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    // Sign out from Firebase
    await signOut(auth);
    console.log(' Signed out from Firebase');

    // Clear AsyncStorage
    await clearUserSession();
    console.log('Cleared AsyncStorage');

    console.log(' User logged out completely');
  } catch (error) {
    console.error(' Error logging out:', error);
    throw error;
  }
};

export const getCurrentUserSession = async (): Promise<UserSession | null> => {
  try {
    return await getUserSession();
  } catch (error) {
    console.error(' Error retrieving user session:', error);
    return null;
  }
};


export const getUserFirestoreData = async (uid: string): Promise<any | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists() ? userDocSnap.data() : null;
  } catch (error) {
    console.error('Error fetching Firestore user data:', error);
    return null;
  }
};


export const saveSessionInteraction = async (
  uid: string,
  characterId: string,
  duration: number,
  transcript: any[]
): Promise<void> => {
  try {
    const sessionDocRef = await addDoc(collection(db, 'sessions'), {
      childUid: uid,
      characterId,
      duration,
      transcript,
      createdAt: Timestamp.now(),
    });

    console.log(`Session saved: sessionId=${sessionDocRef.id}`);
  } catch (error) {
    console.error(' Error saving session interaction:', error);
    throw error;
  }
};

export const linkChildToParent = async (parentEmail: string, childUid: string): Promise<string> => {
  try {
    // IMPORTANT: The parent needs their OWN anonymous sign-in
    // But since we're already authenticated as the child, we need to
    // create a SEPARATE parent document with the child's UID as reference
    
    // For now, use the child's UID as a reference, but store it properly
    const parentDocId = `parent_${childUid}`; // Create a unique parent document ID
    
    const parentRef = doc(db, 'parents', parentDocId);
    const parentSnap = await getDoc(parentRef);
    
    if (parentSnap.exists()) {
      // Update existing parent document
      await updateDoc(parentRef, {
        linkedChildren: arrayUnion(childUid),
        updatedAt: Timestamp.now()
      });
    } else {
      // Create new parent document
      await setDoc(parentRef, {
        email: parentEmail,
        linkedChildren: [childUid],
        hasPassword: false,
        childUid: childUid,  // Store reference to child
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
    
    // Update child's document with parent link
    const childRef = doc(db, 'users', childUid);
    await updateDoc(childRef, {
      linkedParentId: parentDocId,
    });
    
    console.log(`Child ${childUid} linked to parent ${parentDocId}`);
    return parentDocId;
  } catch (error) {
    console.error("Error linking child to parent:", error);
    throw error;
  }
};

