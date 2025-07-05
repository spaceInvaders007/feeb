import React, { useEffect } from 'react';
import RootNavigator from './src/navigation/RootNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced debugging for development
if (__DEV__) {
  // Global error handler
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('🚨 GLOBAL ERROR:', error.message);
    console.log('🚨 ERROR STACK:', error.stack);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  // Intercept JSON.parse
  const originalJSONParse = JSON.parse;
  global.JSON.parse = function (text: string) {
    try {
      console.log('🔍 JSON PARSE ATTEMPT:', text?.substring(0, 50));
      return originalJSONParse(text);
    } catch (error) {
      console.log('🚨 JSON PARSE ERROR:', (error as Error).message);
      console.log('🚨 TEXT BEING PARSED:', text?.substring(0, 200));
      throw error;
    }
  };

  // Clear AsyncStorage for testing
  AsyncStorage.clear().then(() => {
    console.log('🧹 AsyncStorage cleared for testing');
  });
}

export default function App() {
  useEffect(() => {
    // Test Metro bundler reachability
    fetch('http://localhost:8081/status')
      .then((res) => res.text())
      .then((text) => {
        console.log('📡 Metro responded with:', text);
      })
      .catch((err) => {
        console.error('🚨 Metro unreachable:', err.message);
      });
  }, []);

  return <RootNavigator />;
}
