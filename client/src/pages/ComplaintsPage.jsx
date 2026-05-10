import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import api from '../lib/api';
import Spinner from '../components/ui/Spinner';
import { Warning, CheckCirc } from '../components/ui/Icon';

export default function ComplaintsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState([]);

  const [againstRole, setAgainstRole] = useState('seller');
  const [againstEmail, setAgainstEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const loadMine = () => {
    setLoading(true);
    api.get('/complaints/mine')
      .then(r => setMine(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMine(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    setSubmitting(true);
    try {
      await api.post('/complaints', {
        againstRole,
        againstEmail: againstEmail.trim().toLowerCase(),
        subject,
        description,
      });
      setOk('Complaint submitted. Our admins will review it.');
      setSubject('');
      setDescription('');
      loadMine();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <TopBar onBack={() => navigate(-1)} title="Complaints" />

      <div className="view" style={{ padding: '0 16px 24px' }}>
        <div style={{ paddingTop: 16 }}>
          <div className="sec-head" style={{ padding: '10px 0 10px' }}>
            <h2 style={{ margin: 0 }}>Register a complaint</h2>
          </div>

          {error && (
            <div className="login-banner err" style={{ marginBottom: 14 }}>
              <Warning />
              <div>{error}</div>
            </div>
          )}
          {ok && (
            <div className="login-banner" style={{ marginBottom: 14, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #bbf7d0' }}>
              <CheckCirc />
              <div>{ok}</div>
            </div>
          )}

          <form onSubmit={submit} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
            <div className="field">
              <label>Complaint against</label>
              <select className="input" value={againstRole} onChange={(e) => setAgainstRole(e.target.value)}>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
            </div>

            <div className="field" style={{ marginTop: 10 }}>
              <label>Reported user email</label>
              <input className="input" value={againstEmail} onChange={(e) => setAgainstEmail(e.target.value)} placeholder="u2023xxx@giki.edu.pk" />
            </div>

            <div className="field" style={{ marginTop: 10 }}>
              <label>Subject</label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" maxLength={120} />
            </div>

            <div className="field" style={{ marginTop: 10 }}>
              <label>Description</label>
              <textarea
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what happened. Include relevant details."
                style={{ height: 120, paddingTop: 12, resize: 'vertical' }}
                maxLength={3000}
              />
            </div>

            <button className="btn btn-primary btn-block" disabled={submitting} style={{ marginTop: 14, height: 52 }}>
              {submitting ? 'Submitting…' : 'Submit complaint'}
            </button>
          </form>
        </div>

        <div style={{ paddingTop: 18 }}>
          <div className="sec-head" style={{ padding: '10px 0 10px' }}>
            <h2 style={{ margin: 0 }}>Your complaints</h2>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={30} /></div>
          ) : mine.length === 0 ? (
            <div style={{ padding: 14, color: 'var(--muted)' }}>No complaints submitted yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mine.map(c => (
                <div key={c._id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{c.subject}</div>
                    <span className={`admin-badge ${c.status}`} style={{ alignSelf: 'flex-start' }}>{c.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                    Against: {c.againstUser?.name || 'User'} ({c.againstUser?.email}) · {c.againstRole}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                    {c.description}
                  </div>
                  {c.adminNote ? (
                    <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: 'var(--cream-2)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Admin note</div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>{c.adminNote}</div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

