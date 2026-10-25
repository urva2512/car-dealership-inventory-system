import { useState, type FormEvent } from 'react';

interface AdminAccountFormProps {
  onSubmit: (input: { name: string; email: string; password: string }) => Promise<void>;
  loading: boolean;
}

export function AdminAccountForm({ onSubmit, loading }: AdminAccountFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ name, email, password });
  }

  return (
    <section className="admin-account" aria-labelledby="admin-account-title">
      <div>
        <p className="eyebrow">Administrator tools</p>
        <h2 id="admin-account-title">Create administrator</h2>
        <p>New administrators can manage stock and create additional administrator accounts.</p>
      </div>
      <form className="admin-account-form" onSubmit={handleSubmit}>
        <label>Administrator name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></label>
        <label>Administrator email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={255} /></label>
        <label>Administrator password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} /></label>
        <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create administrator'}</button>
      </form>
    </section>
  );
}
