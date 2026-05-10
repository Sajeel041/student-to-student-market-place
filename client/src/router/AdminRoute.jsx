import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/ui/Spinner';

export default function AdminRoute({ children }) {
  const { user, loading, refreshUser } = useAuth();
  const [sessionResolved, setSessionResolved] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setSessionResolved(true);
      return;
    }

    if (user.role === 'admin') {
      setSessionResolved(true);
      return;
    }

    refreshUser().finally(() => setSessionResolved(true));
  }, [loading, user, refreshUser]);

  if (loading || !sessionResolved) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner size={32} />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/admin/login" replace state={{ reason: 'not_admin' }} />;
  }
  return children;
}
