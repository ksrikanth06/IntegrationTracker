/**
 * Set to true to fetch data from the REST API.
 * Set to false to use the bundled static JSON (no network required).
 */
export const USE_API = true;

/**
 * Base URL for all API calls.
 */
export const BASEURL = 'http://localhost:8080';

/**
 * When true (and USE_API is also true), the full API code path runs but every
 * request is answered with local static JSON instead of hitting the network.
 * The response is wrapped in the { response: { results: [...] } } envelope so
 * the parsing logic is exercised end-to-end.
 * Set to false (with USE_API = true) to hit the real API server.
 */
export const USE_MOCK = true;

/**
 * When true, each screen fetches its data only once per login session.
 * Subsequent visits reuse the cached Redux state.
 * A manual "Sync" button is always available to force a refresh.
 * Set to false to re-fetch every time the component mounts.
 */
export const MAINTAIN_CACHE = true;
