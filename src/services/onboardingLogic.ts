import {
  signInAnonymously,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, Timestamp, deleteField, query, where, getDocs } from 'firebase/firestore';
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


const ensureAuthenticated = async (): Promise<User> => {
  
  await auth.authStateReady();

  let user = auth.currentUser;

  if (!user) {
    console.log(' No user found — signing in anonymously...');
    const result = await signInAnonymously(auth);
    user = result.user;
    console.log('Signed in anonymously:', user.uid);
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

//SCREEN 2: Save age consent to Firestore + AsyncStorage
export const saveAgeConsent = async (
  ageString: string
): Promise<{ needsParentConsent: boolean; age: number }> => {
  try {
    // Ensure user is signed in before writing to Firestore
    const user = await ensureAuthenticated();

    const age = parseAgeString(ageString);
    const needsParentConsent = age < 14;

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    // Create or update user document with age consent
    if (!userDocSnap.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        anonId: generateAnonId(),
        age,
        ageConsent: true,
        parentConsent: !needsParentConsent, // If 14+, auto-approve parent consent
        onboardingComplete: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      await updateDoc(userDocRef, {
        age,
        ageConsent: true,
        parentConsent: !needsParentConsent,
        updatedAt: Timestamp.now(),
      });
    }

    // Get the anonId (either existing or newly created)
    const anonId = userDocSnap.exists()
      ? userDocSnap.data().anonId
      : generateAnonId();

    // Save to AsyncStorage for quick access
    await saveUserSession({
      email: user.email || '',
      anonId,
      age,
      ageConsent: true,
      parentConsent: !needsParentConsent,
      timestamp: getCurrentTimestamp(),
    });

    console.log(`Age consent saved: age=${age}, needsParent=${needsParentConsent}`);

    return { needsParentConsent, age };
  } catch (error) {
    console.error('Error saving age consent:', error);
    throw error;
  }
};

// SCREEN 3B: PARENT EMAIL & MATH CHALLENGE

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
  
  // Update consent status
  await updateDoc(consentRef, { status: 'verified', verifiedAt: Timestamp.now() });
  
  // Update user document
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    parentConsent: true,
    consentVerifiedAt: Timestamp.now(),
  });
  
  // ✅ FIX THIS - Delete BOTH email fields
  await updateDoc(userRef, {
    pendingParentEmail: deleteField(),  // Delete this
    // parentEmail: deleteField(),       // Also delete if exists
    consentId: deleteField(),            // Also delete consentId reference
  });
  
  // Delete sensitive data from consent document
  await updateDoc(consentRef, {
    parentEmail: deleteField(),
    mathAnswer: deleteField(),
  });
  
  await saveUserSession({ parentConsent: true });
  
  return true;
};


// SCREEN 4: CHILD PROFILE (NICKNAME)

export const saveChildProfile = async (nickname: string): Promise<void> => {
  try {
    const user = await ensureAuthenticated();
    const trimmed = nickname.trim();

    const userDocRef = doc(db, 'users', user.uid);

    // Always merge into the same users/{uid} document — never a second user row
    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        nickname: trimmed,
        onboardingComplete: true,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    await saveUserSession({
      nickname: trimmed,
      onboardingComplete: true,
      timestamp: getCurrentTimestamp(),
    });

    console.log(` Child profile saved (merge): nickname=${trimmed}`);
  } catch (error) {
    console.error(' Error saving child profile:', error);
    throw error;
  }
};

//  LOGOUT & SESSION MANAGEMENT

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

// Add to onboardingLogic.ts

// Create parent account and link to child
export const linkChildToParent = async (
  parentEmail: string,
  childUid: string
): Promise<string> => {
  // Check if parent already exists
  const parentsRef = collection(db, 'parents');
  const q = query(parentsRef, where('email', '==', parentEmail));
  const querySnapshot = await getDocs(q);
  
  let parentId: string;
  
  if (!querySnapshot.empty) {
    // Parent exists - add child to existing parent
    const parentDoc = querySnapshot.docs[0];
    parentId = parentDoc.id;
    const existingChildren = parentDoc.data().linkedChildren || [];
    await updateDoc(doc(db, 'parents', parentId), {
      linkedChildren: [...existingChildren, childUid],
      updatedAt: Timestamp.now()
    });
  } else {
    // Create new parent account (no password yet - will be set later)
    const newParentRef = await addDoc(collection(db, 'parents'), {
      email: parentEmail,
      linkedChildren: [childUid],
      hasPassword: false,  // Parent hasn't set password yet
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    parentId = newParentRef.id;
  }
  
  // Update child's document with parent link
  const childRef = doc(db, 'users', childUid);
  await updateDoc(childRef, {
    linkedParentId: parentId,
    // Keep email in parent collection only - NOT in child doc
  });
  
  return parentId;
};