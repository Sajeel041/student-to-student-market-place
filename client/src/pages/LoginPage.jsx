import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  validateGikiEmail,
  validatePassword,
  validateName,
} from '../lib/validators';

import {
  ArrowRight,
  CheckCirc,
  Eye,
  EyeOff,
  Verified,
  Warning,
} from '../components/ui/Icon';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [tab, setTab] = useState('signin');
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [showPwd, setShowPwd] = useState(false);

  // Shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  // Register-only
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [batch, setBatch] = useState('');

  const DEPTS = ['CS', 'EE', 'CV', 'ME', 'BBA', 'Other'];

  const getError = (field, val) => {
    if (field === 'email') return validateGikiEmail(val);
    if (field === 'password') return validatePassword(val);
    if (field === 'name') return validateName(val);
    return null;
  };

  const blur = (field, val) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setFieldErrors((e) => ({ ...e, [field]: getError(field, val) }));
  };

  const change = (field, val, setter) => {
    setter(val);
    setAuthError(null);

    if (touched[field]) {
      setFieldErrors((e) => ({
        ...e,
        [field]: getError(field, val),
      }));
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();

    const errs = {
      email: validateGikiEmail(email),
      password: validatePassword(password),
    };

    setTouched({
      email: true,
      password: true,
    });

    setFieldErrors(errs);

    if (Object.values(errs).some(Boolean)) return;

    setSubmitting(true);
    setAuthError(null);

    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setAuthError(
        err.response?.data?.message ||
          'Incorrect email or password.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const errs = {
      name: validateName(name),
      email: validateGikiEmail(email),
      password: validatePassword(password),
    };

    setTouched({
      name: true,
      email: true,
      password: true,
    });

    setFieldErrors(errs);

    if (Object.values(errs).some(Boolean)) return;

    setSubmitting(true);
    setAuthError(null);

    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        dept,
        batch,
      });

      navigate('/', { replace: true });
    } catch (err) {
      setAuthError(
        err.response?.data?.message ||
          'Registration failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const emailValid = !validateGikiEmail(email);
  const pwdValid = !validatePassword(password);
  const nameValid = !validateName(name);

  return (
    <div className="login-shell">
      <div className="login-layout">
        <aside className="login-aside">
          <div className="login-aside-inner">
            <div className="login-brand">
              <span className="login-brand-dot">U</span>
              UniSwap
            </div>

            <div className="login-tag">
              <Verified />
              GIKI Topi students only
            </div>

            <p className="login-aside-lead">
              The campus marketplace for textbooks, electronics, and everything you need between classes.
            </p>
            <ul className="login-aside-points">
              <li><CheckCirc /> Verified @giki.edu.pk accounts</li>
              <li><CheckCirc /> Meet on campus for pickup</li>
              <li><CheckCirc /> Message sellers securely</li>
            </ul>
          </div>
        </aside>

        <main className="login-main">
          <div className="login-card">
        {/* Tabs */}
        <div className="login-tabs-seg" role="tablist" aria-label="Account">
          {['signin', 'register'].map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`login-tabs-seg-btn ${tab === t ? 'active' : ''}`}
              onClick={() => {
                setTab(t);
                setAuthError(null);
                setTouched({});
                setFieldErrors({});
              }}
            >
              {t === 'signin'
                ? 'Sign in'
                : 'Register'}
            </button>
          ))}
        </div>

        {/* SIGN IN */}
        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} noValidate>
            <h1 className="login-title">
              Welcome back.
            </h1>

            <p className="login-sub">
              Sign in with your{' '}
              <strong>@giki.edu.pk</strong> email.
            </p>

            {authError && (
              <div className="login-banner err">
                <Warning />
                <div>{authError}</div>
              </div>
            )}

            <div className="login-field-split">
              {/* EMAIL */}
              <div className="field">
                <label>
                  University email{' '}
                  <span className="req">*</span>
                </label>

                <div
                  className={`input-wrap ${
                    touched.email && fieldErrors.email
                      ? 'has-err'
                      : touched.email && emailValid
                      ? 'has-ok'
                      : ''
                  }`}
                >
                  <input
                    type="email"
                    className={`input ${
                      touched.email &&
                      fieldErrors.email
                        ? 'error'
                        : ''
                    }`}
                    placeholder="u2023633@giki.edu.pk"
                    value={email}
                    autoComplete="username"
                    spellCheck={false}
                    autoCapitalize="none"
                    onChange={(e) =>
                      change(
                        'email',
                        e.target.value,
                        setEmail
                      )
                    }
                    onBlur={() =>
                      blur('email', email)
                    }
                  />

                  {touched.email && emailValid && (
                    <span className="adorn ok">
                      <CheckCirc />
                    </span>
                  )}
                </div>

                {touched.email &&
                  fieldErrors.email && (
                    <div className="err">
                      <Warning />
                      {fieldErrors.email}
                    </div>
                  )}
              </div>

              {/* PASSWORD */}
              <div className="field">
                <label>
                  Password{' '}
                  <span className="req">*</span>
                </label>

                <div
                  className={`input-wrap ${
                    touched.password &&
                    fieldErrors.password
                      ? 'has-err'
                      : ''
                  }`}
                >
                  <input
                    type={
                      showPwd ? 'text' : 'password'
                    }
                    className={`input ${
                      touched.password &&
                      fieldErrors.password
                        ? 'error'
                        : ''
                    }`}
                    placeholder="••••••••"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) =>
                      change(
                        'password',
                        e.target.value,
                        setPassword
                      )
                    }
                    onBlur={() =>
                      blur('password', password)
                    }
                  />

                  <button
                    type="button"
                    className="adorn show"
                    onClick={() =>
                      setShowPwd((s) => !s)
                    }
                  >
                    {showPwd ? (
                      <EyeOff />
                    ) : (
                      <Eye />
                    )}
                  </button>
                </div>

                {touched.password &&
                  fieldErrors.password && (
                    <div className="err">
                      <Warning />
                      {fieldErrors.password}
                    </div>
                  )}
              </div>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
              style={{
                height: 54,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {submitting ? (
                'Signing in…'
              ) : (
                <>
                  Sign in

                  <ArrowRight
                    style={{
                      width: 18,
                      height: 18,
                      flexShrink: 0,
                    }}
                  />
                </>
              )}
            </button>

            <p className="login-mini">
              By continuing you agree to
              UniSwap&apos;s Campus Code of
              Conduct.
            </p>
          </form>
        ) : (
          /* REGISTER */
          <form
            onSubmit={handleRegister}
            noValidate
          >
            <h1 className="login-title">
              Join UniSwap.
            </h1>

            <p className="login-sub">
              Create your account with your{' '}
              <strong>@giki.edu.pk</strong>{' '}
              email.
            </p>

            <div className="login-field-split">
              {/* NAME */}
              <div className="field">
                <label>
                  Full name{' '}
                  <span className="req">*</span>
                </label>

                <div
                  className={`input-wrap ${
                    touched.name && fieldErrors.name
                      ? 'has-err'
                      : touched.name && nameValid
                      ? 'has-ok'
                      : ''
                  }`}
                >
                  <input
                    type="text"
                    className={`input ${
                      touched.name &&
                      fieldErrors.name
                        ? 'error'
                        : ''
                    }`}
                    placeholder="Sara Ahmed"
                    value={name}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[0-9]/g, '');
                      change('name', v, setName);
                    }}
                    onBlur={() => blur('name', name)}
                  />

                  {touched.name && nameValid && (
                    <span className="adorn ok">
                      <CheckCirc />
                    </span>
                  )}
                </div>

                {touched.name && fieldErrors.name && (
                  <div className="err">
                    <Warning />
                    {fieldErrors.name}
                  </div>
                )}
              </div>

              {/* EMAIL */}
              <div className="field">
                <label>
                  University email{' '}
                  <span className="req">*</span>
                </label>

                <div
                  className={`input-wrap ${
                    touched.email && fieldErrors.email
                      ? 'has-err'
                      : touched.email && emailValid
                      ? 'has-ok'
                      : ''
                  }`}
                >
                  <input
                    type="email"
                    className={`input ${
                      touched.email && fieldErrors.email ? 'error' : ''
                    }`}
                    placeholder="u2023633@giki.edu.pk"
                    value={email}
                    autoComplete="username"
                    spellCheck={false}
                    autoCapitalize="none"
                    onChange={(e) =>
                      change('email', e.target.value, setEmail)
                    }
                    onBlur={() => blur('email', email)}
                  />

                  {touched.email && emailValid && (
                    <span className="adorn ok">
                      <CheckCirc />
                    </span>
                  )}
                </div>

                {touched.email && fieldErrors.email && (
                  <div className="err">
                    <Warning />
                    {fieldErrors.email}
                  </div>
                )}
              </div>
            </div>

            {/* PASSWORD */}
            <div className="field">
              <label>
                Password{' '}
                <span className="req">*</span>
              </label>

              <div
                className={`input-wrap ${
                  touched.password && fieldErrors.password ? 'has-err' : ''
                }`}
              >
                <input
                  type={showPwd ? 'text' : 'password'}
                  className={`input ${
                    touched.password && fieldErrors.password ? 'error' : ''
                  }`}
                  placeholder="Min 8 characters"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) =>
                    change('password', e.target.value, setPassword)
                  }
                  onBlur={() => blur('password', password)}
                />

                <button
                  type="button"
                  className="adorn show"
                  onClick={() => setShowPwd((s) => !s)}
                >
                  {showPwd ? <EyeOff /> : <Eye />}
                </button>
              </div>

              {touched.password && fieldErrors.password && (
                <div className="err">
                  <Warning />
                  {fieldErrors.password}
                </div>
              )}
            </div>

            {/* DEPT + BATCH */}
            <div className="login-field-split login-field-split--tight">
              <div className="field">
                <label>Department</label>

                <select
                  className="input"
                  value={dept}
                  onChange={(e) =>
                    setDept(e.target.value)
                  }
                >
                  <option value="">
                    Select
                  </option>

                  {DEPTS.map((d) => (
                    <option
                      key={d}
                      value={d}
                    >
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Batch year</label>

                <input
                  type="text"
                  className="input"
                  placeholder="2022"
                  value={batch}
                  maxLength={4}
                  onChange={(e) =>
                    setBatch(
                      e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 4)
                    )
                  }
                />
              </div>
            </div>

            {/* REGISTER BUTTON */}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
              style={{
                height: 54,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {submitting ? (
                'Creating account…'
              ) : (
                <>
                  Create account

                  <ArrowRight
                    style={{
                      width: 18,
                      height: 18,
                      flexShrink: 0,
                    }}
                  />
                </>
              )}
            </button>

            <p className="login-mini">
              Only @giki.edu.pk emails are
              accepted.
            </p>
          </form>
        )}
          </div>
        </main>
      </div>
    </div>
  );
}