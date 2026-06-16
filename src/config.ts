/**
 * Set to true to fetch integration data from the REST API.
 * Set to false to use the bundled static JSON (no network required).
 */
export const USE_API = false;

/**
 * Base URL for the integrations API. Only used when USE_API is true.
 */
export const API_BASE_URL = 'http://localhost:8080/api';
