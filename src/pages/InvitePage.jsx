import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';

export default function InvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const inviteCode = code.trim().toUpperCase();

    if (!inviteCode) {
      setError('Paste an invite code from a friend.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await api.post('/ledgers/join', { code: inviteCode });
      const ledgerId = result.ledger?.id ?? result.ledgerId ?? result.id;

      if (!ledgerId) {
        throw new Error('The invite worked, but the ledger could not be found.');
      }

      const ledgerName = result.ledger?.name ?? 'the shared ledger';
      setSuccess(`You are now in ${ledgerName}.`);
      window.setTimeout(() => navigate(`/ledger/${ledgerId}`), 700);
    } catch (err) {
      setError(err.message || 'Could not join that ledger.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="invite-page">
      <section className="invite-card card">
        <h1>Join a Grudge Ledger</h1>
        <p className="invite-subtitle">
          Enter the invite code from a friend to start tracking canceled plans,
          late replies, and forgotten favors together.
        </p>

        <form onSubmit={handleSubmit} className="invite-form">
          <label htmlFor="invite-code">Invite code</label>
          <input
            id="invite-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="GRUDGE-1234"
            autoComplete="off"
            spellCheck={false}
            disabled={loading || Boolean(success)}
          />

          <button type="submit" className="btn-primary" disabled={loading || Boolean(success)}>
            {loading ? 'Joining…' : 'Join Ledger'}
          </button>
        </form>

        {success ? <p className="form-success">{success}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
  );
}