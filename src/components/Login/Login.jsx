import { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { RegistrationGuideIcon } from '../../assets/icons';
import '../../styles/components/login.css';

export default function Login() {
  const { login } = useAppState();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-hero">
        <svg
          className="login-hero__photo"
          viewBox="0 0 400 300"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="loginHeroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E8C9A0" />
              <stop offset="55%" stopColor="#7FA88F" />
              <stop offset="100%" stopColor="#6B8CAE" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 L400,0 L400,170 C300,260 100,120 0,210 Z"
            fill="url(#loginHeroGradient)"
          />
        </svg>
        <div className="login-hero__banner">
          <RegistrationGuideIcon className="login-hero__banner-icon" />
          <span className="login-hero__ribbon">Bana Pele</span>
        </div>
      </div>

      <form className="login-screen__form" onSubmit={handleSubmit}>
        <label className="login-field">
          <span className="login-field__label">Email</span>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="login-field">
          <span className="login-field__label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="login-screen__error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
