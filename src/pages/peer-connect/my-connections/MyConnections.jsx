import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../../../components/SearchBar/SearchBar';
import ConnectionCard from '../../../components/ConnectionCard/ConnectionCard';
import { useMyConnections } from '../../../hooks/useConnections';

export default function MyConnections() {
  const { connections, loading } = useMyConnections();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const visibleConnections = connections.filter((connection) =>
    connection.name.toLowerCase().includes(query.toLowerCase())
  );

  function handleChatClick(connection) {
    navigate(`/peer-connect/chat/${connection.id}`, { state: { connection } });
  }

  function handleOpenProfile(connection) {
    navigate(`/peer-connect/profile/${connection.id}`, { state: { profile: connection } });
  }

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search" onFilterClick={() => {}} />
      {loading && <p className="page-status">Loading connections…</p>}
      {!loading && connections.length === 0 && (
        <p className="page-status">
          No connections yet. Practitioners you've connected with will appear here once they accept.
        </p>
      )}
      {!loading && connections.length > 0 && visibleConnections.length === 0 && (
        <p className="page-status">No connections match your search.</p>
      )}
      <div className="connection-list">
        {!loading && visibleConnections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            onChatClick={handleChatClick}
            onOpenProfile={handleOpenProfile}
          />
        ))}
      </div>
    </div>
  );
}
