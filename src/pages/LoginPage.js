import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import '../App.css';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Email and password are required.');
      return;
    }

    try {
      // POST /api/auth/login
      await apiClient.post('/api/auth/login', { email, password });
      // On success, go to /chat
      navigate('/chat');
    } catch (err) {
      if (err.response) {
        if (err.response.status === 400) {
          setErrorMsg('Invalid email or password.');
        } else if (err.response.status === 404) {
          setErrorMsg('User not found.');
        } else {
          setErrorMsg('Login failed. Please try again.');
        }
      } else {
        setErrorMsg('Network error. Please try again.');
      }
    }
  };

  return (
    <div className="container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <label>Email:</label>
        <input
          type="email"
          placeholder="Enter email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password:</label>
        <input
          type="password"
          placeholder="Enter password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>
      </form>

      {errorMsg && <p className="errorMsg">{errorMsg}</p>}

      <hr />
      <button onClick={() => navigate('/signup')}>Go to Signup</button>
    </div>
  );
}

export default LoginPage;

