// src/screens/Onboarding/SplashScreen.tsx
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { getUserSession, isSessionFullyOnboarded } from '../../services/asyncStorage';
import { auth } from '../../services/firebase/config';

function ageGroupLabelFromSession(age: number | undefined): string {
  if (age == null) return '10-14';
  if (age <= 7) return '6-7';
  if (age <= 9) return '8-9';
  if (age <= 11) return '10-11';
  if (age <= 13) return '12-13';
  return '14+';
}

export default function SplashScreen({ navigation }: any) {
  const animation = useRef<LottieView>(null);
  const [redirectTarget, setRedirectTarget] = useState<{
    route: string;
    params?: any;
  } | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    const checkSession = async () => {
      try {
        // Wait for Firebase auth to be ready
        await auth.authStateReady();
        
        // Check local storage for session
        const session = await getUserSession();
        
        if (cancelled) return;
        
        const hasCompletedOnboarding = isSessionFullyOnboarded(session);
        const hasFirebaseUser = auth.currentUser;
        
        console.log('Splash check:', { 
          hasCompletedOnboarding, 
          hasFirebaseUser: !!hasFirebaseUser,
          sessionNickname: session?.nickname 
        });
        
        // Determine redirect target
        if (hasCompletedOnboarding && hasFirebaseUser && session?.nickname) {
          setRedirectTarget({
            route: 'Dashboard',
            params: {}
          });
        } else if (session?.nickname && session?.onboardingComplete) {
          setRedirectTarget({
            route: 'CharacterSelect',
            params: {
              name: session.nickname,
              ageGroup: ageGroupLabelFromSession(session.age),
              fromOnboarding: false,
            }
          });
        } else {
          setRedirectTarget({
            route: 'AgeInput',
            params: {}
          });
        }
        
        // Ready to show animation
        setIsReady(true);
        
      } catch (error) {
        console.error('Splash screen error:', error);
        setRedirectTarget({ route: 'AgeInput', params: {} });
        setIsReady(true);
      }
    };
    
    checkSession();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle animation finish
  const handleAnimationFinish = () => {
    if (redirectTarget) {
      navigation.reset({
        index: 0,
        routes: [{ name: redirectTarget.route, params: redirectTarget.params }]
      });
    }
  };

  // Show nothing while checking
  if (!isReady || !redirectTarget) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <LottieView
        ref={animation}
        source={require('../../../assets/splash_intro.json')}
        style={styles.animation}
        autoPlay
        loop={false}
        onAnimationFinish={handleAnimationFinish}
        renderMode="SOFTWARE"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  animation: { width: '100%', height: '100%' },
});