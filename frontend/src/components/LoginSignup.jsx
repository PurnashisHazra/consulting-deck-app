import React, { useState, useContext } from 'react';
import axios from 'axios';
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
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}${endpoint}`, {
        email,
        password,
      });
      // Update context and localStorage
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
          <div className="mt-4 text-center">
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