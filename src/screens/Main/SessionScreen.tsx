import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SessionScreen({ navigation, route }: any) {
  const { name, character } = route.params || {}

  return (
    <LinearGradient
      colors={['#EEE6FF', '#E8F4FD']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe}>
        <Text style={styles.emoji}>🎙️</Text>
        <Text style={styles.title}>
          Session with {character?.name}
        </Text>
        <Text style={styles.subtitle}>
          Coming soon, {name}!
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>← Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: { fontSize: 80, marginBottom: 20 },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    color: '#2D2D2D',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#8A8A8A',
    marginTop: 8,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#7C5CBF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 20,
  },
  buttonText: {
    color: 'white',
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
})