import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { validateGikiEmail, validatePassword } from '../../lib/validators';
import { ShieldCheck, ArrowRight, Warning, Eye, EyeOff } from '../../components/ui/Icon';
import Spinner from '../../components/ui/Spinner';
import EmailSuggest from '../../components/ui/EmailSuggest';
import './admin.css';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, login, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const reason = location.state?.reason;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {
      email: validateGikiEmail(email),
      password: validatePassword(password),
    };
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setSubmitting(true);
    setError(null);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      if (u.role !== 'admin') {
        // Don't leave the app signed-in as a non-admin on the admin login screen
        await logout();
        setError('This account does not have admin access. Use the designated admin email.');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Sign-in failed. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-loading">
          <Spinner size={36} />
        </div>
      </div>
    );
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <div className="admin-login-logo">
            <ShieldCheck />
          </div>
          <div>
            <h1 className="admin-login-title">Admin sign-in</h1>
            <p className="admin-login-sub">UniSwap admin dashboard — use your admin credentials.</p>
          </div>
        </div>

        {reason === 'not_admin' && (
          <div className="admin-login-banner warn">
            <Warning />
            <span>You are signed in as a regular user. Sign in with an admin account to continue.</span>
          </div>
        )}

        {error && (
          <div className="admin-login-banner err">
            <Warning />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form" noValidate>
          <div className="admin-login-field">
            <label htmlFor="admin-email">University email</label>
            <input
              id="admin-email"
              className={fieldErrors.email ? 'has-error' : ''}
              type="email"
              autoComplete="username"
              spellCheck={false}
              autoCapitalize="none"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
                if (fieldErrors.email) setFieldErrors((x) => ({ ...x, email: null }));
              }}
              placeholder="u2023633@giki.edu.pk"
            />
            <EmailSuggest
              value={email}
              onPick={(full) => {
                setEmail(full);
                setError(null);
                if (fieldErrors.email) setFieldErrors((x) => ({ ...x, email: null }));
              }}
              id="admin-email"
            />
            {fieldErrors.email && <span className="admin-login-field-err">{fieldErrors.email}</span>}
          </div>

          <div className="admin-login-field">
            <label htmlFor="admin-password">Password</label>
            <div className="admin-login-pwd-wrap">
              <input
                id="admin-password"
                className={fieldErrors.password ? 'has-error' : ''}
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                  if (fieldErrors.password) setFieldErrors((x) => ({ ...x, password: null }));
                }}
                placeholder="••••••••"
              />
              <button type="button" className="admin-login-eye" onClick={() => setShowPwd((s) => !s)} aria-label={showPwd ? 'Hide password' : 'Show password'}>
                {showPwd ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {fieldErrors.password && <span className="admin-login-field-err">{fieldErrors.password}</span>}
          </div>

          <button type="submit" className="admin-login-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : (
              <>
                Sign in to admin
                <ArrowRight style={{ width: 18, height: 18 }} />
              </>
            )}
          </button>
        </form>

        <p className="admin-login-footer">
          <Link to="/">← Back to UniSwap</Link>
          {' · '}
          <Link to="/login">Student login</Link>
        </p>
      </div>
    </div>
  );
}
