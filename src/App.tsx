/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import AuthScreen from './components/AuthScreen';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import UpdatePasswordScreen from './components/UpdatePasswordScreen';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { session, isLoading, isPasswordRecovery } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { error } = await supabase.from('books').select('id').limit(1);
        if (error && error.code === '42P01') { // relation does not exist
          setNeedsSetup(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingSetup(false);
      }
    };
    checkSetup();
  }, []);

  if (checkingSetup || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (needsSetup) {
    return <SetupScreen />;
  }

  // If user clicked the reset password link, show the update password screen
  if (isPasswordRecovery) {
    return <UpdatePasswordScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <AppContent />
    </AuthProvider>
  );
}
