import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface UserPlan {
  id: string;
  user_id: string;
  plan_type: 'free' | 'pay_per_notice' | 'pro' | 'enterprise';
  company_name: string | null;
  notices_used: number;
  notices_purchased: number;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: 'active' | 'canceling' | 'canceled' | 'past_due' | null;
  pro_until: string | null;
  isPro: boolean;
  noticesAvailable: number | 'unlimited';
  canCreateNotice: boolean;
  freeNoticesRemaining: number;
}


interface PlanContextType {
  plan: UserPlan | null;
  loading: boolean;
  error: string | null;
  refreshPlan: () => Promise<void>;
  useNotice: () => Promise<boolean>;
  canCreateNotice: () => boolean;
  getNoticesRemaining: () => number | 'unlimited';
}

const defaultPlan: UserPlan = {
  id: '',
  user_id: '',
  plan_type: 'free',
  company_name: null,
  notices_used: 0,
  notices_purchased: 0,
  stripe_customer_id: null,
  subscription_id: null,
  subscription_status: null,
  pro_until: null,
  isPro: false,
  noticesAvailable: 3,
  canCreateNotice: true,
  freeNoticesRemaining: 3,
};

const PlanContext = createContext<PlanContextType>({
  plan: null,
  loading: true,
  error: null,
  refreshPlan: async () => {},
  useNotice: async () => false,
  canCreateNotice: () => true,
  getNoticesRemaining: () => 3,
});

export const usePlan = () => useContext(PlanContext);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const refreshPlan = useCallback(async () => {
    if (!user) {
      setPlan(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('update-user-plan', {
        body: { action: 'get-plan', userId: user.id }
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setPlan(data);
    } catch (err: any) {
      console.error('Error fetching plan:', err);
      setError(err.message);
      // Set default plan on error
      setPlan({
        ...defaultPlan,
        user_id: user.id,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshPlan();
  }, [refreshPlan]);

  const useNotice = useCallback(async (): Promise<boolean> => {
    if (!user || !plan) return false;

    // Pro users don't need to track
    if (plan.isPro) return true;

    // Check if user can create notice
    if (!plan.canCreateNotice) return false;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('update-user-plan', {
        body: { action: 'use-notice', userId: user.id }
      });

      if (fnError || data?.error) {
        console.error('Error using notice:', fnError || data?.error);
        return false;
      }

      // Refresh plan after using notice
      await refreshPlan();
      return true;
    } catch (err) {
      console.error('Error using notice:', err);
      return false;
    }
  }, [user, plan, refreshPlan]);

  const canCreateNotice = useCallback((): boolean => {
    if (!plan) return false;
    return plan.canCreateNotice;
  }, [plan]);

  const getNoticesRemaining = useCallback((): number | 'unlimited' => {
    if (!plan) return 0;
    return plan.noticesAvailable;
  }, [plan]);

  return (
    <PlanContext.Provider value={{
      plan,
      loading,
      error,
      refreshPlan,
      useNotice,
      canCreateNotice,
      getNoticesRemaining,
    }}>
      {children}
    </PlanContext.Provider>
  );
}
