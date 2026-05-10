import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app boot — check if a valid Cognito session already exists
  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      // Step 1: Does Amplify have any cached session at all?
      await getCurrentUser();

      // Step 2: Fetch fresh tokens (forceRefresh avoids stale cached tokens)
      const session = await fetchAuthSession({ forceRefresh: true });

      if (!session.tokens?.idToken) {
        throw new Error('No valid session tokens found');
      }

      const idToken = session.tokens.idToken.toString();

      // Step 3: Validate the token with our backend
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        // Backend rejected the token — clear Amplify session too to stay in sync
        await signOut();
        throw new Error('Session expired or invalid');
      }

      const data = await res.json();
      setUser(data.user);
      setToken(idToken);
    } catch (err) {
      console.log('No active session:', err.message);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    // If Amplify has a stale session, clear it before signing in as someone else
    try {
      const existing = await getCurrentUser();
      if (existing) await signOut();
    } catch (e) {
      // No existing session — that's fine, proceed
    }

    // Sign in with Cognito
    const { isSignedIn } = await signIn({ username: email, password });

    if (!isSignedIn) {
      throw new Error('Sign-in was not completed. Please try again.');
    }

    // Force-refresh to guarantee we get a fresh token (not a cached/stale one)
    const session = await fetchAuthSession({ forceRefresh: true });

    if (!session.tokens?.idToken) {
      await signOut();
      throw new Error('Failed to retrieve session tokens from Cognito.');
    }

    const idToken = session.tokens.idToken.toString();

    // Validate with our backend
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!res.ok) {
      await signOut();
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData.message ||
        'The backend server rejected the login. Make sure your Node.js server is running at localhost:5000.'
      );
    }

    const data = await res.json();
    setUser(data.user);
    setToken(idToken);
  }

  async function logout() {
    await signOut();
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
