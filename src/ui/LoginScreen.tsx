// LoginScreen — the auth gate shown before the main menu (v2.12.0). Two tabs:
// Login and Register. On success the api client holds the session token, the
// store records the username, campaign progress is hydrated from the server,
// and we advance to the main menu.
//
// Themed to match the castle UI: the painterly menu backdrop (screenStyle),
// the gold title, a parchment-scroll card, and a wood-plaque .dt-btn submit.

import { useState, type CSSProperties, type FormEvent } from 'react';
import { login as apiLogin, register as apiRegister, ApiError } from '../api/apiClient';
import { useSessionStore } from '../store/sessionStore';
import { useProgressStore } from '../store/progressStore';
import { playSfx } from '../audio/sfxPlayer';
import {
  screenStyle,
  titleStyle,
  parchmentCardStyle,
  parchmentKickerStyle,
  buttonStyle,
  THEME_FONT,
} from './menuStyles';

type Mode = 'login' | 'register';

export function LoginScreen() {
  const navigate = useSessionStore((s) => s.navigate);
  const setCurrentUser = useSessionStore((s) => s.setCurrentUser);
  const loadProgressFromServer = useProgressStore((s) => s.loadProgressFromServer);

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !busy;

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    playSfx('click');
    setMode(next);
    setError(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    playSfx('click');
    setBusy(true);
    setError(null);
    try {
      const authFn = mode === 'login' ? apiLogin : apiRegister;
      const result = await authFn(username.trim(), password);
      // Hydrate campaign progress from the server (token is now set on the
      // api client by the auth call above).
      await loadProgressFromServer();
      setCurrentUser(result.username);
      navigate('menu');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  };

  return (
    <div style={screenStyle}>
      <div style={{ ...titleStyle, fontSize: 46, marginBottom: 18 }}>Dragon&apos;s Throne</div>

      <div style={{ ...parchmentCardStyle, width: 360 }}>
        <div style={parchmentKickerStyle}>
          {mode === 'login' ? 'Enter the realm' : 'Forge your banner'}
        </div>

        {/* Tabs */}
        <div style={tabRowStyle}>
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={mode === 'login' ? tabActiveStyle : tabStyle}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            style={mode === 'register' ? tabActiveStyle : tabStyle}
          >
            Register
          </button>
        </div>

        <form onSubmit={onSubmit} style={formStyle}>
          <label style={labelStyle}>
            Username
            <input
              type="text"
              value={username}
              autoFocus
              autoComplete="username"
              maxLength={32}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Password
            <input
              type="password"
              value={password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              maxLength={64}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </label>

          {error && <div style={errorStyle}>{error}</div>}

          <button
            type="submit"
            className="dt-btn"
            disabled={!canSubmit}
            style={{
              ...buttonStyle,
              marginTop: 10,
              opacity: canSubmit ? 1 : 0.45,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Enter' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Styles (parchment-friendly: dark-brown text on cream inputs) ─────────
const tabRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 24,
  margin: '4px 0 16px',
};

const tabStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  padding: '2px 4px 4px',
  fontFamily: THEME_FONT,
  fontSize: 16,
  fontWeight: 700,
  color: '#9b7b4e',
  cursor: 'pointer',
  letterSpacing: '0.04em',
};

const tabActiveStyle: CSSProperties = {
  ...tabStyle,
  color: '#3a2a1a',
  borderBottom: '2px solid #8a5a22',
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  textAlign: 'left',
  fontFamily: THEME_FONT,
  fontSize: 13,
  fontWeight: 700,
  color: '#5a4326',
  letterSpacing: '0.05em',
};

const inputStyle: CSSProperties = {
  fontFamily: THEME_FONT,
  fontSize: 15,
  color: '#2e2113',
  background: '#f3e4c4',
  border: '1px solid #b08a55',
  borderRadius: 4,
  padding: '8px 10px',
  outline: 'none',
  boxShadow: 'inset 0 1px 3px rgba(90, 60, 20, 0.25)',
};

const errorStyle: CSSProperties = {
  fontFamily: THEME_FONT,
  fontSize: 13,
  color: '#8a2f1e',
  fontWeight: 700,
  textAlign: 'center',
  marginTop: 2,
};
