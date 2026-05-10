import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      await getCurrentUser();
      const session = await fetchAuthSession();
      const idToken = session.tokens.idToken.toString();
      
      // Fetch full user profile from our Node.js backend (proxied to localhost:5000)
      const res = await fetch(`/api/auth/me`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch user profile');
      
      const data = await res.json();
      
      setUser(data.user);
      setToken(idToken);
    } catch (err) {
      console.log('User not authenticated:', err.message);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    // Force sign out first in case another session is stuck in the browser cache
    try {
      await signOut();
    } catch (e) {
      // Ignore errors if no one was signed in
    }

    const { isSignedIn } = await signIn({ username: email, password });
    if (isSignedIn) {
      await checkUser();
    }
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
