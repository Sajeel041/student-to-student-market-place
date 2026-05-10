import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../lib/api';
import TopBar from '../components/layout/TopBar';
import Spinner from '../components/ui/Spinner';
import { Send } from '../components/ui/Icon';
import { fmtPrice } from '../utils/format';

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const sellerNameFromNav = location.state?.sellerName;
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const [draft, setDraft] = useState('');
  const threadRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const loadThread = useCallback(async () => {
    const [cr, mr] = await Promise.all([
      api.get(`/conversations/${id}`),
      api.get(`/conversations/${id}/messages`),
    ]);
    setConversation(cr.data);
    setMessages(mr.data || []);
    setErr(null);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadThread()
      .catch((e) => {
        if (!cancelled) setErr(e.response?.data?.message || 'Could not load chat.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const t = setInterval(() => {
      api.get(`/conversations/${id}/messages`)
        .then((r) => setMessages(r.data || []))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [id]);

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setErr(null);
    try {
      await api.post(`/conversations/${id}/messages`, { body: text });
      const r = await api.get(`/conversations/${id}/messages`);
      setMessages(r.data || []);
      setDraft('');
      scrollToBottom();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not send.');
    } finally {
      setSending(false);
    }
  };

  const peer = conversation?.peer;
  const listing = conversation?.listing;
  const title = peer?.name || sellerNameFromNav || 'Chat';

  return (
    <div className="page chat-page">
      <TopBar
        onBack={() => navigate('/inbox')}
        kicker="Messages"
        title={title}
        withBorder
        right={<div style={{ width: 44 }} />}
      />

      <div className="view chat-view">
        {loading ? (
          <div className="inbox-loading"><Spinner size={32} /></div>
        ) : err && !conversation ? (
          <div className="empty" style={{ padding: 40 }}>
            <h3>{err}</h3>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/inbox')}>
              Back to messages
            </button>
          </div>
        ) : (
          <>
            {listing && (
              <div className="chat-product-card-wrap">
                <button
                  type="button"
                  className="chat-product-card"
                  onClick={() => navigate(`/listing/${listing._id}`)}
                >
                  <div className="chat-product-card-img">
                    {listing.photos?.[0] ? (
                      <img src={listing.photos[0]} alt="" />
                    ) : (
                      <div className="ph ph-teal" style={{ width: '100%', height: '100%' }} />
                    )}
                  </div>
                  <div className="chat-product-card-info">
                    <div className="chat-product-card-title">{listing.title}</div>
                    {listing.price != null && (
                      <div className="chat-product-card-price">{fmtPrice(listing.price)}</div>
                    )}
                  </div>
                </button>
              </div>
            )}

            <div className="chat-thread" ref={threadRef}>
              <div className="chat-thread-spacer" />
              {messages.length === 0 && (
                <p className="chat-hint">Say hi — ask about condition, pickup, or price.</p>
              )}
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={`chat-bubble-wrap ${m.isMine ? 'mine' : 'theirs'}`}
                >
                  <div className={`chat-bubble ${m.isMine ? 'mine' : 'theirs'}`}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>

            {err && (
              <div className="chat-err">{err}</div>
            )}

            <form className="chat-composer" onSubmit={send}>
              <textarea
                className="chat-input"
                rows={1}
                placeholder="Message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(e);
                  }
                }}
              />
              <button
                type="submit"
                className="chat-send"
                disabled={sending || !draft.trim()}
                aria-label="Send"
              >
                <Send style={{ width: 20, height: 20 }} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
