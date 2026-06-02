// src/screens/Onboarding/AgeGateScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Image, Dimensions, Alert, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { saveAgeConsent, getUserStatus } from '../../services/onboardingLogic';

const { width, height } = Dimensions.get('window');

const AGE_OPTIONS = [
  { label: '6 - 7', value: '6-7', icon: 'leaf', color: '#4CAF50' },
  { label: '8 - 9', value: '8-9', icon: 'star', color: '#FFC107' },
  { label: '10 - 11', value: '10-11', icon: 'rocket', color: '#2196F3' },
  { label: '12 - 13', value: '12-13', icon: 'bulb', color: '#FF9800' },
  { label: '14+', value: '14+', icon: 'ribbon', color: '#9C27B0' },
];

export default function AgeInputScreen({ navigation }: any) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing age in background
  useEffect(() => {
    const loadExistingAge = async () => {
      try {
        const status = await getUserStatus();
        if (status.hasAge && status.currentAgeGroup) {
          setSelected(status.currentAgeGroup);
        }
      } catch (error) {
        console.log('Error loading existing age:', error);
      }
    };
    loadExistingAge();
  }, []);

  const handleContinue = async () => {
    if (!selected || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const { needsParentConsent } = await saveAgeConsent(selected);
      
      if (needsParentConsent) {
        // Use navigate instead of replace to fix back button issue
        navigation.navigate('ParentConsent', { ageGroup: selected, fromAgeGate: true });
      } else {
        navigation.replace('NameInput', { ageGroup: selected, coppaRequired: false });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save age. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#EEE6FF', '#E8F4FD']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          {/* Header Text */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>How old are you?</Text>
            <Text style={styles.subtitle}>
              Every age has its own magic. Which one's yours?
            </Text>
          </View>

          {/* Options List - Responsive grid */}
          <View style={styles.optionsContainer}>
            {AGE_OPTIONS.map((option) => {
              const isSelected = selected === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    isSelected && styles.optionSelected,
                    isLoading && styles.optionDisabled
                  ]}
                  onPress={() => !isLoading && setSelected(option.value)}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: isSelected ? '#7C5CBF20' : option.color + '15' }]}>
                    <Ionicons 
                      name={option.icon as any} 
                      size={width > 380 ? 26 : 22} 
                      color={isSelected ? '#7C5CBF' : option.color} 
                    />
                  </View>

                  <Text style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                    isLoading && styles.optionTextDisabled
                  ]}>
                    {option.label} years old
                  </Text>

                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={width > 380 ? 26 : 22} color="#7C5CBF" />
                  ) : (
                    <View style={styles.emptyCircle} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Hint - Only show when age is selected AND not loading */}
          {selected && !isLoading && (
            <View style={styles.hintContainer}>
              <Ionicons name="information-circle-outline" size={14} color="#7C5CBF" />
              <Text style={styles.hintText}>
                You can change your age anytime
              </Text>
            </View>
          )}

          {/* Button */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!selected || isLoading}
            activeOpacity={0.8}
            style={[
              styles.button,
              { backgroundColor: selected && !isLoading ? '#7C5CBF' : '#D1D1D1' }
            ]}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Setting up..." : (selected ? "Let's Go!" : "Pick your age first")}
            </Text>
            {selected && !isLoading && <Ionicons name="arrow-forward" size={20} color="white" />}
          </TouchableOpacity>

          {/* Extra bottom padding for small screens */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: height > 700 ? 20 : 10,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height > 800 ? 30 : (height > 700 ? 20 : 10),
    marginBottom: height > 800 ? 20 : 15,
  },
  logo: {
    width: width * 0.35,
    height: width * 0.12,
    maxWidth: 140,
    minWidth: 100,
  },
  headerTextContainer: {
    alignItems: 'center',
    marginBottom: height > 700 ? 20 : 15,
  },
  title: {
    fontSize: width > 400 ? 28 : 24,
    fontFamily: 'Poppins-ExtraBold',
    color: '#2D2D2D',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: width > 400 ? 14 : 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  optionsContainer: {
    width: '100%',
    flex: 1,
    marginTop: height > 700 ? 10 : 5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: width > 400 ? 14 : 12,
    marginBottom: width > 400 ? 12 : 10,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  optionSelected: {
    borderColor: '#7C5CBF',
    backgroundColor: '#F7F2FF',
    elevation: 5,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  iconWrapper: {
    width: width > 400 ? 48 : 42,
    height: width > 400 ? 48 : 42,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width > 400 ? 16 : 12,
  },
  optionText: {
    fontSize: width > 400 ? 17 : 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#444444',
    flex: 1,
  },
  optionTextSelected: {
    color: '#7C5CBF',
    fontFamily: 'Poppins-Bold',
  },
  optionTextDisabled: {
    opacity: 0.6,
  },
  emptyCircle: {
    width: width > 400 ? 24 : 20,
    height: width > 400 ? 24 : 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  button: {
    width: '100%',
    paddingVertical: width > 400 ? 16 : 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: height > 700 ? 10 : 5,
    marginBottom: 10,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: width > 400 ? 18 : 16,
    fontFamily: 'Poppins-Bold',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#7C5CBF10',
    borderRadius: 20,
    alignSelf: 'center',
  },
  hintText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: '#7C5CBF',
  },
  bottomSpacer: {
    height: 20,
  },
});