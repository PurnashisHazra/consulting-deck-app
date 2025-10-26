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
  const [progressStages, setProgressStages] = useState([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const navigate = useNavigate();
  const { setIsAuthenticated, setToken } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    // Define staged progress depending on login vs signup
    const stages = isLogin
      ? ['Verifying credentials', 'Loading interface', 'Loading Deck Generator']
      : ['Creating profile', 'Loading interface', 'Loading Deck Generator'];
    setProgressStages(stages);
    setCurrentStageIndex(0);
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        email,
        password,
      });
      setToken(response.data.access_token);
      setIsAuthenticated(true);
      // Advance progress quickly — keep it responsive while avoiding artificial long waits
      setCurrentStageIndex(1);
      // Allow UI to render the intermediate stage briefly (micro-wait)
      await new Promise((r) => setTimeout(r, 120));
      setCurrentStageIndex(2);
      // Finalize and navigate once interface is ready
      setIsLoading(false);
      navigate('/deck-generator');
    } catch (error) {
      setIsLoading(false);
      setProgressStages([]);
      setCurrentStageIndex(-1);
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
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.warn('Google client ID is not set. Set REACT_APP_GOOGLE_CLIENT_ID in frontend/.env to enable Google Sign-In.');
        return;
      }
      if (window.google && window.google.accounts && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleResponse,
          });
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
          });
        } catch (e) {
          console.error('Failed to initialize Google Identity Services:', e);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleResponse = async (response) => {
    // Staged loader for Google flow
    const stages = ['Verifying Google account', 'Loading interface', 'Loading Deck Generator'];
    setProgressStages(stages);
    setCurrentStageIndex(0);
    setIsLoading(true);
    try {
      // Send ID token to backend for verification and JWT
      const res = await axios.post(`${API_BASE_URL}/auth/google/callback`, {
        id_token: response.credential,
      });
      setToken(res.data.access_token);
      setIsAuthenticated(true);
      setCurrentStageIndex(1);
      await new Promise((r) => setTimeout(r, 120));
      setCurrentStageIndex(2);
      setIsLoading(false);
      navigate('/deck-generator');
    } catch (err) {
      setIsLoading(false);
      setProgressStages([]);
      setCurrentStageIndex(-1);
      alert('Google login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      {isLoading ? (
        <div className="text-center">
          <p className="text-lg font-bold mb-2">Getting you ready...</p>
          <div className="w-full bg-gray-200 rounded h-3 overflow-hidden mb-3">
            <div
              className="h-3 bg-blue-600"
              style={{ width: `${Math.max(0, Math.min(100, ((currentStageIndex + 1) / Math.max(1, progressStages.length)) * 100))}%`, transition: 'width 180ms linear' }}
            />
          </div>
          <div className="text-left text-sm">
            {progressStages && progressStages.length > 0 ? (
              <ul className="space-y-2">
                {progressStages.map((s, i) => (
                  <li key={i} className="flex items-center">
                    <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full mr-2 ${i <= currentStageIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {i < currentStageIndex ? '✓' : (i === currentStageIndex ? (<svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="0"></circle></svg>) : i+1)}
                    </span>
                    <span className={i <= currentStageIndex ? 'text-gray-800 font-medium' : 'text-gray-600'}>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">Loading…</p>
            )}
          </div>
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
            {!process.env.REACT_APP_GOOGLE_CLIENT_ID && (
              <p className="text-sm text-yellow-600 mt-2 text-center">Google Sign-In is not configured. Please set <code>REACT_APP_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code>.</p>
            )}
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