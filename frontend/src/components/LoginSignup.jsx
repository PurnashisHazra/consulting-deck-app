import React, { useState, useContext, useEffect, useRef } from 'react';
// Google Identity Services script loader
const loadGoogleScript = () => {
  if (document.getElementById('google-client-script')) return;
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.id = 'google-client-script';
  document.body.appendChild(script);
};
import axios from 'axios';
import { API_BASE_URL } from '../api';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

const LoginSignup = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loader state
  const navigate = useNavigate();
  const { setIsAuthenticated, setToken } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        email,
        password,
      });
      setToken(response.data.access_token);
      setIsAuthenticated(true);
      setTimeout(() => {
        setIsLoading(false);
        navigate('/deck-generator');
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      alert(error.response?.data?.detail || 'An error occurred');
    }
  };

  // Google login integration
  const googleBtnRef = useRef(null);
  useEffect(() => {
    loadGoogleScript();
    window.onGoogleLibraryLoad = () => {
      /* no-op, script loads automatically */
    };
    const timer = setTimeout(() => {
      if (window.google && window.google.accounts && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleResponse = async (response) => {
    setIsLoading(true);
    try {
      // Send ID token to backend for verification and JWT
      const res = await axios.post(`${API_BASE_URL}/auth/google/callback`, {
        id_token: response.credential,
      });
      setToken(res.data.access_token);
      setIsAuthenticated(true);
      setTimeout(() => {
        setIsLoading(false);
        navigate('/deck-generator');
      }, 1000);
    } catch (err) {
      setIsLoading(false);
      alert('Google login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      {isLoading ? (
        <div className="text-center">
          <p className="text-lg font-bold">Loading...</p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-4 text-center">
            {isLogin ? 'Login' : 'Sign Up'}
          </h2>
          {/* Google Sign-In/Sign-Up button on top (popup) */}
          <div className="mb-4">
            <div
              ref={googleBtnRef}
              className="w-full"
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                padding: '0',
              }}
            />
          </div>
          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-grow h-px bg-gray-300" />
            <span className="mx-2 text-gray-400 font-semibold">OR</span>
            <div className="flex-grow h-px bg-gray-300" />
          </div>
          {/* Email/Password form below */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
            >
              {isLogin ? 'Login' : 'Sign Up'}
            </button>
          </form>
          <div className="mt-2 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-500 hover:underline"
            >
              {isLogin ? 'Create an account' : 'Already have an account? Login'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LoginSignup;