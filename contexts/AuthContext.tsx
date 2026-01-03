import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, SUPABASE_NOT_CONFIGURED_ERROR } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RESEND_COOLDOWN_KEY = 'email_verification_resend_timestamp';
const RESEND_COOLDOWN_SECONDS = 60; // 1 minute cooldown

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isEmailVerified: boolean;
  pendingVerificationEmail: string | null;
  resendCooldown: number;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
  clearPendingVerification: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check if email is verified
  const isEmailVerified = user?.email_confirmed_at != null;

  // Load pending verification email from storage
  useEffect(() => {
    const loadPendingEmail = async () => {
      try {
        const email = await AsyncStorage.getItem('pending_verification_email');
        if (email) {
          setPendingVerificationEmail(email);
        }
      } catch (error) {
        console.error('Error loading pending email:', error);
      }
    };
    loadPendingEmail();
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    const checkCooldown = async () => {
      try {
        const timestamp = await AsyncStorage.getItem(RESEND_COOLDOWN_KEY);
        if (timestamp) {
          const elapsed = Math.floor((Date.now() - parseInt(timestamp)) / 1000);
          const remaining = RESEND_COOLDOWN_SECONDS - elapsed;
          if (remaining > 0) {
            setResendCooldown(remaining);
          } else {
            await AsyncStorage.removeItem(RESEND_COOLDOWN_KEY);
          }
        }
      } catch (error) {
        console.error('Error checking cooldown:', error);
      }
    };
    checkCooldown();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        AsyncStorage.removeItem('pending_verification_email');
        setPendingVerificationEmail(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      return { error: SUPABASE_NOT_CONFIGURED_ERROR as Error };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Use default Supabase redirect
        },
      });
      
      if (!error && data.user && !data.user.email_confirmed_at) {
        // Store pending verification email
        await AsyncStorage.setItem('pending_verification_email', email);
        setPendingVerificationEmail(email);
        
        // Set initial cooldown
        await AsyncStorage.setItem(RESEND_COOLDOWN_KEY, Date.now().toString());
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        
        return { error: null, needsVerification: true };
      }
      
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      return { error: SUPABASE_NOT_CONFIGURED_ERROR as Error };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Check if user needs to verify email
      if (!error && data.user && !data.user.email_confirmed_at) {
        // Store pending verification email
        await AsyncStorage.setItem('pending_verification_email', email);
        setPendingVerificationEmail(email);
      }
      
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    await AsyncStorage.removeItem('pending_verification_email');
    await AsyncStorage.removeItem(RESEND_COOLDOWN_KEY);
    setPendingVerificationEmail(null);
    setResendCooldown(0);
    await supabase.auth.signOut();
  };

  const resendVerificationEmail = async () => {
    if (!isSupabaseConfigured) {
      return { error: SUPABASE_NOT_CONFIGURED_ERROR as Error };
    }

    if (!pendingVerificationEmail) {
      return { error: new Error('No pending verification email') };
    }

    // Check cooldown
    if (resendCooldown > 0) {
      return { error: new Error(`Please wait ${resendCooldown} seconds before resending`) };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingVerificationEmail,
      });

      if (!error) {
        // Set cooldown
        await AsyncStorage.setItem(RESEND_COOLDOWN_KEY, Date.now().toString());
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      }

      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const clearPendingVerification = useCallback(async () => {
    await AsyncStorage.removeItem('pending_verification_email');
    await AsyncStorage.removeItem(RESEND_COOLDOWN_KEY);
    setPendingVerificationEmail(null);
    setResendCooldown(0);
  }, []);

  const refreshSession = async () => {
    if (!isSupabaseConfigured) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isConfigured: isSupabaseConfigured,
      isEmailVerified,
      pendingVerificationEmail,
      resendCooldown,
      signUp, 
      signIn, 
      signOut,
      resendVerificationEmail,
      clearPendingVerification,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
