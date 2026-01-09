import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISCLAIMER_ACKNOWLEDGED_KEY = 'disclaimer_acknowledged_v1';

interface DisclaimerContextType {
  hasAcknowledgedDisclaimer: boolean;
  isLoading: boolean;
  acknowledgeDisclaimer: () => Promise<void>;
  resetDisclaimer: () => Promise<void>;
}

const DisclaimerContext = createContext<DisclaimerContextType | undefined>(undefined);

export function DisclaimerProvider({ children }: { children: ReactNode }) {
  const [hasAcknowledgedDisclaimer, setHasAcknowledgedDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDisclaimerStatus();
  }, []);

  const loadDisclaimerStatus = async () => {
    try {
      const acknowledged = await AsyncStorage.getItem(DISCLAIMER_ACKNOWLEDGED_KEY);
      setHasAcknowledgedDisclaimer(acknowledged === 'true');
    } catch (error) {
      console.error('Error loading disclaimer status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeDisclaimer = async () => {
    try {
      await AsyncStorage.setItem(DISCLAIMER_ACKNOWLEDGED_KEY, 'true');
      setHasAcknowledgedDisclaimer(true);
    } catch (error) {
      console.error('Error saving disclaimer acknowledgment:', error);
    }
  };

  const resetDisclaimer = async () => {
    try {
      await AsyncStorage.removeItem(DISCLAIMER_ACKNOWLEDGED_KEY);
      setHasAcknowledgedDisclaimer(false);
    } catch (error) {
      console.error('Error resetting disclaimer:', error);
    }
  };

  return (
    <DisclaimerContext.Provider value={{
      hasAcknowledgedDisclaimer,
      isLoading,
      acknowledgeDisclaimer,
      resetDisclaimer,
    }}>
      {children}
    </DisclaimerContext.Provider>
  );
}

export function useDisclaimer() {
  const context = useContext(DisclaimerContext);
  if (context === undefined) {
    throw new Error('useDisclaimer must be used within a DisclaimerProvider');
  }
  return context;
}
