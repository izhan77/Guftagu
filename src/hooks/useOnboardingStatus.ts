// src/hooks/useOnboardingStatus.ts
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export function useOnboardingStatus() {
  const [isLoading, setIsLoading] = useState(true)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    checkOnboarding()
  }, [])

  const checkOnboarding = async () => {
    try {
      const data = await AsyncStorage.getItem('guftagu_user')
      if (data) {
        setIsOnboarded(true)
        setUserData(JSON.parse(data))
      }
    } catch (e) {
      console.log(e)
    } finally {
      setIsLoading(false)
    }
  }

  const completeOnboarding = async (userData: any) => {
    await AsyncStorage.setItem('guftagu_user', JSON.stringify(userData))
    setIsOnboarded(true)
    setUserData(userData)
  }

  return { isLoading, isOnboarded, userData, completeOnboarding }
}