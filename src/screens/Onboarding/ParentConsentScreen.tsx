// src/screens/Onboarding/ParentConsentScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ParentConsentScreen({ navigation, route }: any) {
  const { ageGroup, fromAgeGate } = route.params || { ageGroup: 'Under 14', fromAgeGate: false };

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const handleGoBack = () => {
    // If coming from AgeGate, go back to AgeGate
    if (fromAgeGate) {
      navigation.replace('AgeInput');
    } else {
      // If coming from somewhere else, try to go back
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('AgeInput');
      }
    }
  };

  return (
    <LinearGradient colors={['#F7F2FF', '#FFFFFF']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Back Button at Top Left */}
        <TouchableOpacity style={styles.backButtonTop} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#7C5CBF" />
        </TouchableOpacity>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.shieldCircle}>
            <Ionicons name="shield-checkmark" size={50} color="#7C5CBF" />
          </View>

          <Text style={styles.title}>Parental Guidance</Text>
          <Text style={styles.subtitle}>
            To keep our journey safe and fun, we need a parent to help set things up!
          </Text>

          <View style={styles.infoCard}>
            {[
              { icon: 'eye-outline', text: 'Monitor activity & energy points' },
              { icon: 'lock-closed-outline', text: 'AI safety filters are always active' },
              { icon: 'notifications-outline', text: 'Get updates on learning progress' }
            ].map((item, index) => (
              <View key={index} style={styles.bullet}>
                <Ionicons name={item.icon as any} size={22} color="#7C5CBF" />
                <Text style={styles.bulletText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('ParentEmail', { ageGroup })}
          >
            <Text style={styles.buttonText}>Continue to Parent Setup</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  backButtonTop: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 92, 191, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  shieldCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#7C5CBF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-ExtraBold',
    color: '#2D2D2D',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    marginTop: 30,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  bulletText: {
    marginLeft: 14,
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: '#444',
    flex: 1,
  },
  button: {
    width: '100%',
    backgroundColor: '#7C5CBF',
    paddingVertical: 18,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 10,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
  },
  backButton: {
    marginTop: 20,
  },
  backButtonText: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
});