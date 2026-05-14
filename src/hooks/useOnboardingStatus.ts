// src/hooks/useOnboardingStatus.ts

import { useState, useEffect } from 'react';
import { checkUserOnboarding } from '../services/onboardingLogic';
import {
  getUserSession,
  isSessionFullyOnboarded,
  type UserSession,
} from '../services/asyncStorage';

export function useOnboardingStatus() {
  const [isLoading, setIsLoading] = useState(true);
  const [route, setRoute] = useState<'dashboard' | 'age-gate' | null>(null);
  const [userData, setUserData] = useState<UserSession | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const routingDecision = await checkUserOnboarding();
        const session = await getUserSession();

        setRoute(routingDecision.route);
        setUserData(session);
        setIsOnboarded(isSessionFullyOnboarded(session));
      } catch (error) {
        console.error('Error initializing app:', error);
        setRoute('age-gate');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const completeOnboarding = async (data: any) => {
    setIsOnboarded(true);
    setUserData(data);
  };

  return {
    isLoading,
    isOnboarded,
    userData,
    route,
    completeOnboarding,
  };
}