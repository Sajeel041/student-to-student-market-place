import { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import Spinner from '../components/ui/Spinner';
import { Inbox, ChevR } from '../components/ui/Icon';
import { fmtRelativeTime } from '../utils/format';

export default function InboxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const openChatId = location.state?.openChatId;
  const sellerNameFromListing = location.state?.sellerName;
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    if (!openChatId) return;
    navigate(`/chat/${openChatId}`, {
      replace: true,
      state: { sellerName: sellerNameFromListing },
    });
  }, [openChatId, sellerNameFromListing, navigate]);

  useEffect(() => {
    if (openChatId) return;
    let cancelled = false;
    setLoading(true);
    api.get('/conversations')
      .then((r) => { if (!cancelled) setConversations(r.data || []); })
      .catch(() => { if (!cancelled) setConversations([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [openChatId]);

  if (openChatId) {
    return (
      <div className="page">
        <TopBar title="Messages" />
        <div className="view">
          <div className="inbox-loading"><Spinner size={32} /></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page">
      <TopBar title="Messages" />

      <div className="view">
        <div className="inbox-intro">
          <h1>Messages</h1>
          <p className="sub">Chat with sellers about listings — pickup, offers, and questions.</p>
        </div>

        {loading ? (
          <div className="inbox-loading">
            <Spinner size={32} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty inbox-empty">
            <div className="ico"><Inbox style={{ width: 40, height: 40, color: 'var(--border-2)' }} /></div>
            <h3>No chats yet</h3>
            <p>Open any listing and tap <strong>Message</strong> to start a conversation with the seller.</p>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
              Browse listings
            </button>
          </div>
        ) : (
          <div className="inbox-list">
            {conversations.map((c) => {
              const peer = c.peer;
              const listing = c.listing;
              const title = listing?.title || 'Listing';
              const when = c.lastMessageAt || c.updatedAt;
              const preview = c.lastMessagePreview || (c.youAreBuyer ? 'Tap to message seller' : 'Tap to reply');
              return (
                <button
                  key={c._id}
                  type="button"
                  className="inbox-row"
                  onClick={() => navigate(`/chat/${c._id}`, { state: { sellerName: peer?.name } })}
                >
                  <div className="inbox-row-ico inbox-row-ico--chat">
                    {peer?.avatarUrl ? (
                      <img src={peer.avatarUrl} alt="" className="inbox-avatar-img" />
                    ) : (
                      <span className="inbox-avatar-letter">{peer?.name?.[0]?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <div className="inbox-row-body">
                    <div className="inbox-row-top">
                      <span className="inbox-row-peer">{peer?.name || 'Seller'}</span>
                      <span className="inbox-row-time">{fmtRelativeTime(when)}</span>
                    </div>
                    <div className="inbox-row-title">{title}</div>
                    <div className="inbox-row-meta inbox-row-preview">{preview}</div>
                  </div>
                  <ChevR style={{ width: 18, height: 18, color: 'var(--subtle)', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
