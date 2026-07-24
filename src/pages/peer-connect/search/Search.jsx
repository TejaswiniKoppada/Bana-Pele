import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../../../components/SearchBar/SearchBar';
import FilterBar from '../../../components/FilterBar/FilterBar';
import SearchRadar from '../../../components/SearchRadar/SearchRadar';
import ConnectionCard from '../../../components/ConnectionCard/ConnectionCard';
import SearchMapView from '../../../components/SearchMapView/SearchMapView';
import { useConnectionSearch } from '../../../hooks/useConnections';
import { useAppState } from '../../../context/AppStateContext';
import { initiateConnection } from '../../../services/connectionsService';

const DEFAULT_CONNECT_MESSAGE = 'Hi, I would like to connect with you.';
const MAP_NOT_YET_AVAILABLE = 'Not yet available — coming soon';

export default function Search() {
  const { state } = useAppState();
  const { currentUser } = state;
  const [query, setQuery] = useState('');
  const [searchToken, setSearchToken] = useState(0);
  const { results, searching } = useConnectionSearch(query, searchToken);
  const [requests, setRequests] = useState({}); // { [userId]: { state: 'sending'|'sent'|'error', error?: string } }
  const [view] = useState('list'); // Map view disabled — see search-view-toggle__btn--disabled below.
  const navigate = useNavigate();

  // Typing debounces so the real name-search endpoint isn't called on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setSearchToken((token) => token + 1), 400);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleOpenProfile(connection) {
    navigate(`/peer-connect/profile/${connection.id}`, { state: { profile: connection } });
  }

  async function handleSendRequest(connection) {
    setRequests((prev) => ({ ...prev, [connection.id]: { state: 'sending' } }));
    try {
      const response = await initiateConnection(connection.id, DEFAULT_CONNECT_MESSAGE);
      if (response?.status === 'REQUESTED') {
        setRequests((prev) => ({ ...prev, [connection.id]: { state: 'sent' } }));
      } else {
        setRequests((prev) => ({
          ...prev,
          [connection.id]: {
            state: 'error',
            error: response?.message || 'Could not send the request. Please try again.',
          },
        }));
      }
    } catch (err) {
      setRequests((prev) => ({ ...prev, [connection.id]: { state: 'error', error: err.message } }));
    }
  }

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search mentors" />
      <FilterBar />

      {(searching || !results) && <SearchRadar name={currentUser.name} />}

      {!searching && results && (
        <>
          <div className="search-view-toggle">
            <button
              className={`search-view-toggle__btn${view === 'list' ? ' search-view-toggle__btn--active' : ''}`}
            >
              List
            </button>
            <button
              className="search-view-toggle__btn search-view-toggle__btn--disabled"
              disabled
              title={MAP_NOT_YET_AVAILABLE}
            >
              Map
            </button>
          </div>

          {view === 'list' && (
            <div className="connection-list">
              {results.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onOpenProfile={handleOpenProfile}
                  onSendRequest={handleSendRequest}
                  requestState={requests[connection.id]?.state}
                  requestError={requests[connection.id]?.error}
                />
              ))}
            </div>
          )}

          {view === 'map' && <SearchMapView results={results} currentUserName={currentUser.name} />}
        </>
      )}
    </div>
  );
}
