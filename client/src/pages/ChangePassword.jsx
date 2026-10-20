import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { supabase } from '../api/supabase.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth.jsx';

export default function ChangePassword() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters for your new password.');
    if (password === '123456') return setError('Choose a new password. Do not keep the temporary password.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await api('/auth/users', { method: 'POST', body: { action: 'password_changed', userId: user.id } });
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(e.message || 'Unable to update the password. Contact your administrator.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page password-setup-page">
    <section className="panel password-setup-panel">
      <div className="brand-mark large">L</div>
      <div className="eyebrow">SECURE YOUR ACCOUNT</div>
      <h1>Change your temporary password</h1>
      <p>Welcome, {user?.fullName}. Set a private password before accessing your LIVYA account and health information.</p>
      <form className="form-stack" onSubmit={submit}>
        <label>New password<input autoFocus type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Enter it again"/></label>
        {error && <div role="alert" className="form-error">{error}</div>}
        <button className="primary-button full" disabled={busy}>{busy ? 'Updating password…' : 'Save new password'} <KeyRound size={16}/></button>
      </form>
      <div className="auth-bottom"><ShieldCheck size={15}/><span>Your health records remain locked until this step is complete.</span></div>
      <button className="text-link" onClick={() => logout().then(() => navigate('/login'))}>Sign out</button>
    </section>
  </main>;
}
