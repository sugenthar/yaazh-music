import Constants from 'expo-constants';

const PRODUCTION_API_URL = 'https://api.yaazh-music.com'; // Placeholder until a real domain is configured
const DEV_PORT = 3000;

const getDevHost = () => {
  // Derive the dev machine's LAN IP from the Metro bundler host so real devices
  // can reach the local backend during development.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return host;
  }
  return 'localhost';
};

const getEnvVars = () => {
  const releaseChannel = Constants.expoConfig?.releaseChannel;
  if (releaseChannel === 'production') {
    return { API_BASE_URL: PRODUCTION_API_URL };
  }
  return { API_BASE_URL: `http://${getDevHost()}:${DEV_PORT}` };
};

export default getEnvVars();