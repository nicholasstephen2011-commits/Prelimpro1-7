'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const redirectTo = searchParams?.get('redirect') || '/dashboard';
  const errorParam = searchParams?.get('error');

  const isSignUp = mode === 'signup';

  // Show a friendly message if redirected due to missing auth
  const needsAuth = errorParam === 'auth_required';
  const entryMessage = needsAuth ? 'Please sign in to continue.' : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setMessage('Check your email to complete sign up. (Local Supabase may skip confirmation.)');
        setMode('signin');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push(redirectTo);
      }
    } catch (err) {
      const description = err?.message || 'Unable to complete the request. Please try again.';
      setError(description);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{isSignUp ? 'Create an account' : 'Welcome back'}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {entryMessage || (isSignUp ? 'Sign up with your email to get started.' : 'Sign in to access your dashboard.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                placeholder="Enter a strong password"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && entryMessage && <p className="text-sm text-amber-600">{entryMessage}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />}
            {loading ? (isSignUp ? 'Signing up...' : 'Signing in...') : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-gray-700">
          <button
            type="button"
            onClick={() => setMode(isSignUp ? 'signin' : 'signup')}
            className="text-blue-600 font-semibold hover:text-blue-700"
          >
            {isSignUp ? 'Have an account? Sign in' : 'Need an account? Sign up'}
          </button>
          <Link href="/" className="text-gray-600 hover:text-gray-800">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
