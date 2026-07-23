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
import { mockLocationForId } from '../../../utils/mockLocation';

const DEFAULT_CONNECT_MESSAGE = 'Hi, I would like to connect with you.';

export default function Search() {
  const { state, setPeerConnectFilters } = useAppState();
  const { peerConnectFilters, currentUser } = state;
  const [query, setQuery] = useState('');
  const [searchToken, setSearchToken] = useState(0);
  const { results, searching } = useConnectionSearch(peerConnectFilters, query, searchToken);
  const [requests, setRequests] = useState({}); // { [userId]: { state: 'sending'|'sent'|'error', error?: string } }
  const [view, setView] = useState('list'); // 'list' | 'map'
  const navigate = useNavigate();

  // MOCK: the logged-in user's own location, same fabricated source as
  // every result's location — see utils/mockLocation.js.
  const currentUserLocation = mockLocationForId(currentUser.id);

  // Filter changes re-search immediately; typing debounces so the real
  // name-search endpoint isn't called on every keystroke.
  useEffect(() => {
    setSearchToken((token) => token + 1);
  }, [peerConnectFilters]);

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
      <FilterBar filters={peerConnectFilters} onChange={setPeerConnectFilters} />

      {(searching || !results) && (
        <SearchRadar name={currentUser.name} location={currentUserLocation.name} />
      )}

      {!searching && results && (
        <>
          <div className="search-view-toggle">
            <button
              className={`search-view-toggle__btn${view === 'list' ? ' search-view-toggle__btn--active' : ''}`}
              onClick={() => setView('list')}
            >
              List
            </button>
            <button
              className={`search-view-toggle__btn${view === 'map' ? ' search-view-toggle__btn--active' : ''}`}
              onClick={() => setView('map')}
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

          {view === 'map' && (
            <SearchMapView
              results={results}
              currentUserName={currentUser.name}
              currentUserLocation={currentUserLocation.name}
            />
          )}
        </>
      )}
    </div>
  );
}
