import { useState, type FormEvent } from 'react';

export type AuthMode = 'login' | 'register';

interface AuthFormProps {
  onSubmit: (mode: AuthMode, input: { name?: string; email: string; password: string }) => Promise<void>;
  loading: boolean;
}

export function AuthForm({ onSubmit, loading }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(mode, { name, email, password });
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <p className="eyebrow">Account</p>
      <h2 id="auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} />
        </label>
        <button className="button button-primary" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
        </button>
      </form>
      <button className="text-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
      </button>
    </section>
  );
}
