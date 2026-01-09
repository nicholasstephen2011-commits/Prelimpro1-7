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
  pendingUserId: string | null;
  resendCooldown: number;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
  verifyEmailCode: (code: string) => Promise<{ error: Error | null; success?: boolean }>;
  clearPendingVerification: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check if email is verified
  const isEmailVerified = user?.email_confirmed_at != null;

  // Load pending verification email from storage
  useEffect(() => {
    const loadPendingData = async () => {
      try {
        const email = await AsyncStorage.getItem('pending_verification_email');
        const userId = await AsyncStorage.getItem('pending_verification_user_id');
        if (email) {
          setPendingVerificationEmail(email);
        }
        if (userId) {
          setPendingUserId(userId);
        }
      } catch (error) {
        console.error('Error loading pending data:', error);
      }
    };
    loadPendingData();
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
    // Skip Supabase initialization if not configured
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Clear pending verification when user confirms email
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        AsyncStorage.removeItem('pending_verification_email');
        AsyncStorage.removeItem('pending_verification_user_id');
        setPendingVerificationEmail(null);
        setPendingUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Send verification email using our custom edge function
  const sendVerificationEmail = async (email: string, userId: string): Promise<{ error: Error | null }> => {
    try {
      console.log('Sending verification email to:', email, 'for user:', userId);
      
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: { email, userId }
      });

      if (error) {
        console.error('Edge function error:', error);
        return { error: new Error(error.message || 'Failed to send verification email') };
      }

      if (!data?.success) {
        console.error('Email send failed:', data?.error);
        return { error: new Error(data?.error || 'Failed to send verification email') };
      }

      console.log('Verification email sent successfully');
      return { error: null };
    } catch (err) {
      console.error('Error sending verification email:', err);
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      return { error: SUPABASE_NOT_CONFIGURED_ERROR as Error };
    }

    try {
      // Sign up with Supabase Auth (email confirmation disabled - we handle it ourselves)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Don't send Supabase's default confirmation email
          emailRedirectTo: undefined,
        },
      });
      
      if (error) {
        console.error('Supabase signup error:', error);
        return { error: error as Error };
      }

      if (data.user) {
        // Store pending verification data
        await AsyncStorage.setItem('pending_verification_email', email);
        await AsyncStorage.setItem('pending_verification_user_id', data.user.id);
        setPendingVerificationEmail(email);
        setPendingUserId(data.user.id);
        
        // Send our custom verification email via Resend
        const { error: emailError } = await sendVerificationEmail(email, data.user.id);
        
        if (emailError) {
          console.error('Failed to send verification email:', emailError);
          // Don't fail signup, but log the error
          // User can still resend later
        }
        
        // Set initial cooldown
        await AsyncStorage.setItem(RESEND_COOLDOWN_KEY, Date.now().toString());
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        
        return { error: null, needsVerification: true };
      }
      
      return { error: new Error('Signup failed - no user returned') };
    } catch (err) {
      console.error('Signup error:', err);
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
        // Store pending verification data
        await AsyncStorage.setItem('pending_verification_email', email);
        await AsyncStorage.setItem('pending_verification_user_id', data.user.id);
        setPendingVerificationEmail(email);
        setPendingUserId(data.user.id);
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
    await AsyncStorage.removeItem('pending_verification_user_id');
    await AsyncStorage.removeItem(RESEND_COOLDOWN_KEY);
    setPendingVerificationEmail(null);
    setPendingUserId(null);
    setResendCooldown(0);
    await supabase.auth.signOut();
  };

  const resendVerificationEmail = async () => {
    if (!isSupabaseConfigured) {
      return { error: SUPABASE_NOT_CONFIGURED_ERROR as Error };
    }

    if (!pendingVerificationEmail || !pendingUserId) {
      return { error: new Error('No pending verification email') };
    }

    // Check cooldown
    if (resendCooldown > 0) {
      return { error: new Error(`Please wait ${resendCooldown} seconds before resending`) };
    }

    // Send verification email using our custom edge function
    const { error } = await sendVerificationEmail(pendingVerificationEmail, pendingUserId);

    if (!error) {
      // Set cooldown
      await AsyncStorage.setItem(RESEND_COOLDOWN_KEY, Date.now().toString());
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    }

    return { error };
  };

  const verifyEmailCode = async (code: string) => {
    if (!isSupabaseConfigured) {
      return { error: SUPABASE_NOT_CONFIGURED_ERROR as Error };
    }

    if (!pendingVerificationEmail) {
      return { error: new Error('No pending verification email') };
    }

    try {
      console.log('Verifying code:', code, 'for email:', pendingVerificationEmail);
      
      const { data, error } = await supabase.functions.invoke('verify-email-token', {
        body: { 
          code: code.toUpperCase(), 
          email: pendingVerificationEmail 
        }
      });

      if (error) {
        console.error('Verification error:', error);
        return { error: new Error(error.message || 'Verification failed') };
      }

      if (!data?.success) {
        console.error('Verification failed:', data?.error);
        return { error: new Error(data?.error || 'Invalid verification code') };
      }

      // Clear pending verification data
      await AsyncStorage.removeItem('pending_verification_email');
      await AsyncStorage.removeItem('pending_verification_user_id');
      await AsyncStorage.removeItem(RESEND_COOLDOWN_KEY);
      setPendingVerificationEmail(null);
      setPendingUserId(null);
      setResendCooldown(0);

      // Refresh the session to get updated user data
      await refreshSession();

      console.log('Email verified successfully');
      return { error: null, success: true };
    } catch (err) {
      console.error('Verification error:', err);
      return { error: err as Error };
    }
  };

  const clearPendingVerification = useCallback(async () => {
    await AsyncStorage.removeItem('pending_verification_email');
    await AsyncStorage.removeItem('pending_verification_user_id');
    await AsyncStorage.removeItem(RESEND_COOLDOWN_KEY);
    setPendingVerificationEmail(null);
    setPendingUserId(null);
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
      pendingUserId,
      resendCooldown,
      signUp, 
      signIn, 
      signOut,
      resendVerificationEmail,
      verifyEmailCode,
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
