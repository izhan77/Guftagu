import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

export default function SplashScreen({ navigation }: any) {
  const animation = useRef<LottieView>(null);

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