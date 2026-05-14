// src/hooks/useOnboardingStatus.ts
import { useState, useEffect } from 'react';
import { getUserSession, isSessionFullyOnboarded, UserSession } from '../services/asyncStorage';

export function useOnboardingStatus() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [userData, setUserData] = useState<UserSession | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const session = await getUserSession();
      const onboarded = isSessionFullyOnboarded(session);
      setIsOnboarded(onboarded);
      setUserData(session);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = (data: UserSession) => {
    setIsOnboarded(true);
    setUserData(data);
  };

  return { isLoading, isOnboarded, userData, completeOnboarding };
}