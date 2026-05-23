import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';


const validateEmail = (email: string): { isValid: boolean; errorMessage: string } => {
  if (!email.trim()) {
    return { isValid: false, errorMessage: "Email is required" };
  }
  
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{1F018}-\u{1F270}\u{238C}\u{2B50}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/u;
  if (emojiRegex.test(email)) {
    return { isValid: false, errorMessage: "Email cannot contain emojis" };
  }
  
  const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, errorMessage: "Please enter a valid email address" };
  }
  
  return { isValid: true, errorMessage: "" };
};




export default function ParentConsentScreen({ navigation, route }: any) {
  const { ageGroup } = route.params || { ageGroup: 'Under 14' };
  
  // Added: Email validation states
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // Added: Email change handler
  const handleEmailChange = (text: string) => {
    setEmail(text);
    const { errorMessage } = validateEmail(text);
    setEmailError(errorMessage);
  };
  
  // Added: Validation check for button
  const isValidEmail = validateEmail(email).isValid;

  // Modified: Function to handle continue with email
  const handleContinue = () => {
    if (isValidEmail) {
      navigation.navigate('ParentEmail', { ageGroup, parentEmail: email });
    }
  };

  return (
    <LinearGradient colors={['#F7F2FF', '#FFFFFF']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          
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

          {/* Added: Email Input Field */}
          <View style={styles.emailContainer}>
            <Text style={styles.emailLabel}>Parent Email Address</Text>
            <TextInput
              style={[
                styles.emailInput,
                { borderColor: emailError ? '#FF3B30' : '#E0E0E0' }
              ]}
              placeholder="parent@example.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailError ? (
              <Text style={styles.errorText}>
                {emailError}
              </Text>
            ) : null}
          </View>

          {/* Modified: Continue button with validation */}
          <TouchableOpacity 
            style={[styles.button, { opacity: !isValidEmail ? 0.5 : 1 }]}
            onPress={handleContinue}
            disabled={!isValidEmail}
          >
            <Text style={styles.buttonText}>Continue to Parent Setup</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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
  scroll: { alignItems: 'center', padding: 24 },
  shieldCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#7C5CBF15', justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  title: { fontSize: 28, fontFamily: 'Poppins-ExtraBold', color: '#2D2D2D', textAlign: 'center' },
  subtitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: '#8A8A8A', textAlign: 'center', marginTop: 10, lineHeight: 24 },
  infoCard: { backgroundColor: '#F9F9F9', borderRadius: 24, padding: 24, width: '100%', marginTop: 30 },
  bullet: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  bulletText: { marginLeft: 14, fontSize: 15, fontFamily: 'Poppins-Medium', color: '#444', flex: 1 },
  
  // Added styles for email input
  emailContainer: { width: '100%', marginTop: 30 },
  emailLabel: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#2D2D2D', marginBottom: 8, marginLeft: 4 },
  emailInput: { 
    width: '100%', 
    borderWidth: 2, 
    borderRadius: 16, 
    padding: 14, 
    fontSize: 16, 
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#FFFFFF',
    color: '#2D2D2D'
  },
  errorText: { fontSize: 12, color: '#FF3B30', marginTop: 4, marginLeft: 4 },
  
  button: { width: '100%', backgroundColor: '#7C5CBF', paddingVertical: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40, gap: 10, elevation: 4 },
  buttonText: { color: 'white', fontSize: 17, fontFamily: 'Poppins-Bold' },
  backButton: { marginTop: 20 },
  backButtonText: { color: '#AAA', fontSize: 14, fontFamily: 'Poppins-SemiBold' }
});