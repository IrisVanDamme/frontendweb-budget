import { createContext, useMemo, useState, useCallback, useEffect, useContext } from 'react';
import * as usersApi from '../api/users';
import * as api from '../api';
import config from '../config.json';

const JWT_TOKEN_KEY = config.token_key;
const AuthContext = createContext();

function parseJwt(token) {
  if (!token) return {};
  const base64Url = token.split('.')[1];
  const payload = Buffer.from(base64Url, 'base64');
  const jsonPayload = payload.toString('ascii');
  return JSON.parse(jsonPayload);
}

function parseExp(exp) {
  if (!exp) return null;
  if (typeof exp !== 'number') exp = Number(exp);
  if (isNaN(exp)) return null;
  return new Date(exp * 1000);
}

const useAuth = () => useContext(AuthContext);

export const useSession = () => {
  const { token, user, ready, loading, error } = useAuth();
  return {
    token,
    user,
    ready,
    error,
    loading,
    isAuthed: Boolean(token),
  };
};

export const useLogin = () => {
  const { login } = useAuth();
  return login;
};

export const useLogout = () => {
  const { logout } = useAuth();
  return logout;
};

export const AuthProvider = ({
  children,
}) => {
  // will be false until the token is set
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState(localStorage.getItem(JWT_TOKEN_KEY));
  const [user, setUser] = useState(null);

  const setSession = useCallback((token) => {
    const { exp } = parseJwt(token);
    const expiry = parseExp(exp);
    const stillValid = expiry >= new Date();

    if (stillValid) {
      localStorage.setItem(JWT_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(JWT_TOKEN_KEY);
      token = null;
    }

    api.setAuthToken(token);
    setToken(token);
    setReady(token && stillValid);
  }, []);

  useEffect(() => {
    setSession(token);
  }, [token, setSession]);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const { token, user } = await usersApi.login(email, password);
      setUser(user);
      setSession(token);
      return true;
    } catch (error) {
      console.error(error);
      setError('Login failed, try again');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setSession]);

  const logout = useCallback(() => {
    setSession(null);
  }, [setSession]);

  const value = useMemo(() => ({
    token,
    user,
    ready,
    loading,
    error,
    login,
    logout,
  }), [token, user, ready, loading, error, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
