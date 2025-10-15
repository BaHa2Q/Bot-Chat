const { ApiClient } = require('@twurple/api');
const { ChatClient } = require('@twurple/chat');
const { getJoinedChannels, getTokenFromDB } = require('./database');
const { RefreshingAuthProvider } = require('@twurple/auth');
const { refreshTokenIfNeeded } = require('./tokenManager');
const messageMain = require('./messageMain');
require('dotenv').config();

let apiClient, chatClient;
let currentAccessToken = null;
let joinedChannels = [];
let authProvider;

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

// تحديث القنوات المنضمة للدردشة
async function updateJoinedChannels() {
  try {
    const allChannelsInfo = (await getJoinedChannels()).channelHasJoin || [];
    const newChannels = allChannelsInfo.map(c => c.channel);

    const changed = JSON.stringify(newChannels.sort()) !== JSON.stringify(joinedChannels.sort());
    if (!changed) return;

    joinedChannels = newChannels;
    console.log('🔄 Updating joined channels:', joinedChannels);

    if (chatClient) {
      await chatClient.quit();
      console.log('🛑 Disconnected old chat client.');
    }

    chatClient = new ChatClient({ authProvider, channels: joinedChannels });

    chatClient.onMessage(async (channel, user, message, msg) => {
      messageMain(chatClient, channel, user, message, msg);
    });

    chatClient.onConnect(() => {
      console.log('✅ Chat client connected.');
    });

    chatClient.onDisconnect((manually, reason) => {
      console.warn('⚠️ Chat client disconnected.', { manually, reason });
    });

    await chatClient.connect();
  } catch (err) {
    console.error('⚠️ Failed to update joined channels:', err);
  }
}

// تهيئة Twitch Clients
async function initTwitchClients() {
  try {
    const tokenData = await getTokenFromDB();
    if (!tokenData) return console.error('❌ No token data found.');

    // تفادي التحديث المتكرر إذا نفس التوكن
    if (tokenData.accessToken === currentAccessToken) return;
    currentAccessToken = tokenData.accessToken;

    authProvider = new RefreshingAuthProvider({ clientId, clientSecret });

    authProvider.onRefresh(async (_, newToken) => {
      await refreshTokenIfNeeded(newToken);
    });

    await authProvider.addUserForToken(
      {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresIn: tokenData.expiresIn,
        obtainmentTimestamp: tokenData.obtainmentTimestamp
      },
      ['chat']
    );

    apiClient = new ApiClient({ authProvider });

    await updateJoinedChannels(); // المرة الأولى

    // كل دقيقة افحص إذا تغيرت القنوات
    setInterval(updateJoinedChannels, 60 * 1000);
  } catch (err) {
    console.error('❌ Failed to initialize Twitch clients:', err);
  }
}

// التعامل مع الأخطاء العامة
process.on('unhandledRejection', (reason) => {
  console.error('❗ Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❗ Uncaught Exception:', err);
});

// التصدير
module.exports = {
  initTwitchClients};
