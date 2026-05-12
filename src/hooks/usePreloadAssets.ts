import { useState, useEffect } from 'react';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';

export function usePreloadAssets() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadAssets() {
      try {
        // Load fonts
        await Font.loadAsync({
          'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
          'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
          'Poppins-SemiBold': require('../../assets/fonts/Poppins-SemiBold.ttf'),
          'Poppins-ExtraBold': require('../../assets/fonts/Poppins-ExtraBold.ttf'),
        });

        // Preload logo image
        await Asset.loadAsync(require('../../assets/logo.png'));

        setIsReady(true);
      } catch (error) {
        console.log('Asset loading error:', error);
        setIsReady(true); 
      }
    }
    loadAssets();
  }, []);

  return isReady;
}