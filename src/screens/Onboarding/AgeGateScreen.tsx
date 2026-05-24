// src/screens/Onboarding/AgeGateScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Image, Dimensions, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { saveAgeConsent } from '../../services/onboardingLogic';

const { width } = Dimensions.get('window');

const AGE_OPTIONS = [
  { label: '6 - 7', value: '6-7', icon: 'leaf', color: '#4CAF50' },
  { label: '8 - 9', value: '8-9', icon: 'star', color: '#FFC107' },
  { label: '10 - 11', value: '10-11', icon: 'rocket', color: '#2196F3' },
  { label: '12 - 13', value: '12-13', icon: 'bulb', color: '#FF9800' },
  { label: '14+', value: '14+', icon: 'ribbon', color: '#9C27B0' },
];

export default function AgeInputScreen({ navigation }: any) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selected) return;
    
    try {
      const { needsParentConsent, age } = await saveAgeConsent(selected);
      
      if (needsParentConsent) {
        navigation.navigate('ParentConsent', { ageGroup: selected });
      } else {
        navigation.navigate('NameInput', { ageGroup: selected, coppaRequired: false });
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to save age. Please try again.');
    }
  };

  return (
    <LinearGradient colors={['#EEE6FF', '#E8F4FD']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        
        {/* Logo Section */}
        <Image 
          source={require('../../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        {/* Header Text */}
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>How old are you?</Text>
          <Text style={styles.subtitle}>
            Every age has its own magic.{'\n'}Which one's yours?
          </Text>
        </View>

        {/* Options List */}
        <View style={styles.optionsContainer}>
          {AGE_OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  isSelected && styles.optionSelected
                ]}
                onPress={() => setSelected(option.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrapper, { backgroundColor: isSelected ? '#7C5CBF20' : option.color + '15' }]}>
                   <Ionicons 
                    name={option.icon as any} 
                    size={26} 
                    color={isSelected ? '#7C5CBF' : option.color} 
                  />
                </View>

                <Text style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected
                ]}>
                  {option.label} years old
                </Text>

                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={26} color="#7C5CBF" />
                ) : (
                   <View style={styles.emptyCircle} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Updated Solid Purple Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.8}
          style={[
            styles.button,
            { backgroundColor: selected ? '#7C5CBF' : '#D1D1D1' }
          ]}
        >
          <Text style={styles.buttonText}>
            {selected ? "Let's Go!" : "Pick your age first"}
          </Text>
          {selected && <Ionicons name="arrow-forward" size={22} color="white" />}
        </TouchableOpacity>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 40,
    marginTop: 40,
    marginBottom: 15,
  },
  headerTextContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 25,
    fontFamily: 'Poppins-ExtraBold',
    color: '#2D2D2D',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 22,
  },
  optionsContainer: {
    width: '100%',
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  optionSelected: {
    borderColor: '#7C5CBF',
    backgroundColor: '#F7F2FF',
    elevation: 6,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
    color: '#444444',
    flex: 1,
  },
  optionTextSelected: {
    color: '#7C5CBF',
    fontFamily: 'Poppins-Bold',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 60,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
});