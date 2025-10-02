

import React, { createContext, useState, useEffect, useContext, PropsWithChildren, useCallback } from 'react';
import { supabase } from '../supabase';
// FIX: Import UserResponse to correctly type the return value of updateUserPassword.
import { Session, User, AuthResponse, UserResponse } from '@supabase/supabase-js';
import { Profile } from '../types';

// Helper to convert object keys from snake_case (database) to camelCase (app)
const toCamelCase = (obj: Record<string, any>): Record<string, any> => {
  if (!obj) return obj;
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj;
};

// Helper to convert object keys from camelCase (app) to snake_case (database)
const toSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  if (!obj) return obj;
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = obj[key];
    }
  }
  return newObj;
};


interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string, username: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<Omit<Profile, 'id'>>) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  // FIX: Change the return type to UserResponse to match what supabase.auth.updateUser returns.
  updateUserPassword: (password: string) => Promise<UserResponse>;
  clearPasswordRecoveryFlag: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const RECOVERY_FLAG_KEY = 'flowmind-password-recovery';

export const AuthProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => sessionStorage.getItem(RECOVERY_FLAG_KEY) === 'true');

  const getUserProfile = useCallback(async (user: User) => {
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(userProfile ? (toCamelCase(userProfile) as Profile) : null);
    } catch (error: any) {
      console.error("Gagal mengambil profil pengguna:", error.message || error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem(RECOVERY_FLAG_KEY, 'true');
          setIsPasswordRecovery(true);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      getUserProfile(user);
    } else {
      setProfile(null);
    }
  }, [user, getUserProfile]);

  const signInWithPassword = (email: string, password: string): Promise<AuthResponse> => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = (email: string, password: string, username: string) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    // Manually clear the state to ensure the UI updates reliably, especially in PWA environments
    // where the onAuthStateChange listener might be delayed.
    setSession(null);
    setUser(null);
    setProfile(null);
  };
  
  const resetPasswordForEmail = (email: string) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
  };

  const updateUserPassword = (password: string) => {
    return supabase.auth.updateUser({ password });
  };
  
  const clearPasswordRecoveryFlag = () => {
    sessionStorage.removeItem(RECOVERY_FLAG_KEY);
    setIsPasswordRecovery(false);
  };


  const updateUserProfile = async (updates: Partial<Omit<Profile, 'id'>>) => {
    if (!user || !profile) return;
    try {
      const snakeCaseUpdates = toSnakeCase(updates);
      const { error } = await supabase
        .from('profiles')
        .update(snakeCaseUpdates)
        .eq('id', user.id);
      
      if (error) throw error;
      
      setProfile(prevProfile => {
          if (!prevProfile) return null;
          return { ...prevProfile, ...updates };
      });

    } catch (error: any) {
      console.error("Error updating user profile:", error.message || error);
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    isPasswordRecovery,
    signInWithPassword,
    signUp,
    signOut,
    updateUserProfile,
    resetPasswordForEmail,
    updateUserPassword,
    clearPasswordRecoveryFlag,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
