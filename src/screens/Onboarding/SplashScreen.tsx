// src/screens/Onboarding/SplashScreen.tsx
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { getUserSession, isSessionFullyOnboarded } from '../../services/asyncStorage';

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
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getUserSession();
        if (cancelled) return;
        
        // If user already completed onboarding, go straight to character select
        if (isSessionFullyOnboarded(session)) {
          navigation.replace('CharacterSelect', {
            name: session!.nickname!.trim(),
            ageGroup: ageGroupLabelFromSession(session!.age),
            fromOnboarding: false, 
          });
          return;
        }
      } catch (e) {
        console.warn('Splash session check failed', e);
      }
      if (!cancelled) setShowIntro(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  if (!showIntro) {
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
        onAnimationFinish={() => navigation.replace('AgeInput')}
        renderMode="SOFTWARE"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  animation: { width: '100%', height: '100%' },
});