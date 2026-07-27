// Directory search shares its mapping/request logic with the rest of the
// Connections domain (see features/connections/api/connections.api.js) — the
// mentor directory and "my connections" list are two views over the same
// underlying Elevate records. Re-exported here so Search-owned code depends
// on a search.api.js of its own rather than reaching into another feature's
// api file directly.
export { searchConnections, searchMentorsByName } from '@/features/connections/api/connections.api';
