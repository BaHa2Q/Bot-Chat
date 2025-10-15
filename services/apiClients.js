const { ApiClient } = require('@twurple/api');
const { StaticAuthProvider } = require('@twurple/auth');
const { getJoinedChannels } = require('./database');
require('dotenv').config({ debug: false });

const apiClients = new Map();

function createApiClient(tokenData) {
  const authProvider = new StaticAuthProvider(
    process.env.TWITCH_CLIENT_ID,
    tokenData.access_token
  );

  const apiClient = new ApiClient({ authProvider });
  apiClients.set(tokenData.channel.toLowerCase(), apiClient);
  return apiClient;
}

async function initializeAllApiClients() {
  const result = await getJoinedChannels();
  const allChannelsInfo = result.channelHasJoin || [];

  for (const tokenData of allChannelsInfo) {
    try {
      createApiClient(tokenData);
    } catch (err) {
      console.error(`❌ فشل مع ${tokenData.channel}:`, err.message);
    }
  }
}

function getApiClient(channelName) {
  return apiClients.get(channelName.toLowerCase());
}

module.exports = {
  initializeAllApiClients,
  getApiClient,
};
