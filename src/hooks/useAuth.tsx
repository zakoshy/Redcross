"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, UserRole } from '../types';
import { testSupabaseConnection } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  loginAsMock: (mockUser: any, mockProfile: Profile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local mock session first
    const storedUser = localStorage.getItem('pfa_mock_user');
    const storedProfile = localStorage.getItem('pfa_mock_profile');

    if (storedUser && storedProfile) {
      try {
        setUser(JSON.parse(storedUser));
        setProfile(JSON.parse(storedProfile));
        setLoading(false);
        return;
      } catch (e) {
        console.error('Failed to parse mock session', e);
      }
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // If we have a local mock session, ignore Supabase session changes unless it's a real login
      if (localStorage.getItem('pfa_mock_user')) {
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, maybe user was created before migration
          console.warn('Profile not found for user:', userId);
          setProfile(null);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  const loginAsMock = (mockUser: any, mockProfile: Profile) => {
    localStorage.setItem('pfa_mock_user', JSON.stringify(mockUser));
    localStorage.setItem('pfa_mock_profile', JSON.stringify(mockProfile));
    setUser(mockUser as any);
    setProfile(mockProfile);
    setLoading(false);
  };

  const signOut = async () => {
    localStorage.removeItem('pfa_mock_user');
    localStorage.removeItem('pfa_mock_profile');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, loginAsMock }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
