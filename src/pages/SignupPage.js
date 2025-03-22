import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import '../App.css';

function SignupPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Email and password are required.');
      return;
    }

    try {
      // POST /api/auth/signup
      await apiClient.post('/api/auth/signup', { email, password });
      // If successful, redirect to login
      navigate('/');
    } catch (err) {
      if (err.response) {
        if (err.response.status === 409) {
          setErrorMsg('That email is already in use.');
        } else {
          setErrorMsg(
            err.response.data.message ||
            'Signup failed. Please try again.'
          );
        }
      } else {
        setErrorMsg('Network error. Please try again.');
      }
    }
  };

  return (
    <div className="container">
      <h2>Signup</h2>
      <form onSubmit={handleSignup}>
        <label>Email:</label>
        <input
          type="email"
          placeholder="Enter your email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password:</label>
        <input
          type="password"
          placeholder="Enter your password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Sign Up</button>
      </form>

      {errorMsg && <p className="errorMsg">{errorMsg}</p>}

      <hr />
      <button onClick={() => navigate('/')}>Back to Login</button>
    </div>
  );
}

export default SignupPage;

