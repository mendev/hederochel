// src/frontend/pages/UsersMngPage.tsx
import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { useAuth } from '../lib/AuthContext';

interface UserRow {
  id: string;
  email: string | null;
  role: string | null;
  full_name: string | null;
}

function UserManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { user, role } = useAuth();

  useEffect(() => {
    // only fetch if authenticated & (optionally) role allows
    if (!user) return;
    setLoading(true);

    // In dev, we can use a VITE_ADMIN_API_KEY to pass a header
    // In production you should protect the endpoint server-side.
    const adminKey = import.meta.env.VITE_ADMIN_API_KEY ?? '';
 
    fetch('/api/admin/users', {
  headers: adminKey ? { 'x-admin-secret': adminKey } : undefined,
})
  .then(async (res) => {
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to fetch users: ${res.status} ${res.statusText} - ${txt.slice(0, 1000)}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Expected JSON but got ${contentType}: ${text.slice(0, 1000)}`);
    }
    return res.json();
  })
  .then((data: UserRow[]) => setUsers(data))
  .catch((err) => {
    console.error('Error loading users:', err);
    setUsers([]);
  })
  .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="page-content">
      <h2>ניהול משתמשים</h2>
      <div className="page-section">
        {loading ? (
          <div>טוען משתמשים…</div>
        ) : (
          <>
            <DataTable
              data={users}
              hideColumns={['id']}
              onSelect={(id) => setSelectedId(id)}
              selectedId={selectedId}
              selectionLabel="בחר"
              className="users-table"
            />
            <div style={{ marginTop: 12 }}>
              <strong>Selected user:</strong>{' '}
              {selectedId ? users.find((u) => u.id === selectedId)?.email ?? selectedId : '—'}
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                disabled={!selectedId}
                onClick={() => {
                  // Placeholder for future action
                  alert(`You would perform an action on user ${selectedId}`);
                }}
              >
                Perform action (placeholder)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UserManagementPage;
