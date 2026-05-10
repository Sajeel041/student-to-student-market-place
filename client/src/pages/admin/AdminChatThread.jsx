import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import { fmtDateTime } from '../../utils/format';

export default function AdminChatThread() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [msgs, setMsgs] = useState([]);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/conversations/${id}/messages`)
      .then(r => setMsgs(r.data || []))
      .catch(() => setMsgs([]))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div className="admin-chat-thread">
      {msgs.length === 0 ? (
        <div style={{ color: 'var(--muted)' }}>No messages.</div>
      ) : (
        msgs.map(m => (
          <div key={m._id} className="admin-chat-msg">
            <div className="admin-chat-msg-meta">
              <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{m.sender?.name || 'Unknown'}</span>
              <span className="mono" style={{ color: 'var(--muted)' }}>{m.sender?.email || ''}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{fmtDateTime(m.createdAt)}</span>
            </div>
            <div className="admin-chat-msg-body">{m.body}</div>
          </div>
        ))
      )}
    </div>
  );
}

