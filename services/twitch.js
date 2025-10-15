const { ApiClient } = require('@twurple/api');
const { ChatClient } = require('@twurple/chat');
const { getJoinedChannels, getTokenFromDB } = require('./database');
const { RefreshingAuthProvider } = require('@twurple/auth');
const { refreshTokenIfNeeded } = require('./tokenManager');
const messageMain = require('./messageMain');
require('dotenv').config({ debug: false }); // إيقاف رسائل dotenv

let apiClient, chatClient;
let currentAccessToken = null;
let joinedChannels = [];
let authProvider;

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

// تسجيل أحداث الدردشة
function registerChatEvents(client) {
  client.onConnect(() => {
    console.log('✅ Chat client connected.');
  });

  client.onDisconnect((manually, reason) => {
    if (manually) {
      console.log('🛑 Chat client disconnected manually.');
    } else {
      console.warn('⚠️ Chat client disconnected unexpectedly.', { reason });
      // حاول إعادة الاتصال مرة واحدة بعد 10 ثواني
      setTimeout(() => {
        connectChat();
      }, 10_000);
    }
  });

  client.onMessage(async (channel, user, message, msg) => {
    messageMain(client, channel, user, message, msg);
  });
}

// إنشاء اتصال دردشة جديد فقط عند الحاجة
async function connectChat() {
  if (!authProvider || joinedChannels.length === 0) return;
  
  try {
    if (chatClient && chatClient.isConnected) return; // لا تعيد الاتصال إذا متصل بالفعل

    chatClient = new ChatClient({
      authProvider,
      channels: joinedChannels,
      requestMembershipEvents: false, // لتقليل الضغط
      rateLimits: { highPrivmsgLimit: 10 } // يحد من الإرسال السريع
    });

    registerChatEvents(chatClient);

    await chatClient.connect();
  } catch (err) {
    console.error('❌ Failed to connect chat client:', err);
  }
}

// تحديث القنوات المنضمة
async function updateJoinedChannels() {
  try {
    const data = await getJoinedChannels();
    const newChannels = (data?.channelHasJoin || []).map(c => c.channel);

    const changed =
      JSON.stringify(newChannels.sort()) !== JSON.stringify(joinedChannels.sort());

    if (!changed) return; // لا تعمل شيء إذا نفس القنوات

    console.log('🔄 Updating joined channels...');
    joinedChannels = newChannels;

    if (chatClient && chatClient.isConnected) {
      const toJoin = joinedChannels.filter(c => !chatClient.currentChannels.includes(c));
      const toLeave = chatClient.currentChannels.filter(c => !joinedChannels.includes(c));

      // بدل ما تعمل quit كلي، فقط عدّل القنوات المطلوبة
      for (const ch of toLeave) await chatClient.part(ch);
      for (const ch of toJoin) await chatClient.join(ch);

      console.log(`✅ Updated channels (joined: ${toJoin.length}, left: ${toLeave.length})`);
    } else {
      await connectChat();
    }
  } catch (err) {
    console.error('⚠️ Failed to update joined channels:', err);
  }
}

// تهيئة Twitch Clients
async function initTwitchClients() {
  try {
    const tokenData = await getTokenFromDB();
    if (!tokenData) return console.error('❌ No token data found.');

    if (tokenData.accessToken === currentAccessToken) return;
    currentAccessToken = tokenData.accessToken;

    authProvider = new RefreshingAuthProvider({ clientId, clientSecret });
    authProvider.onRefresh(async (_, newToken) => refreshTokenIfNeeded(newToken));

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
    // افحص التغييرات كل 10 دقائق بدل 5 لتقليل الضغط
    setInterval(updateJoinedChannels, 1 * 60 * 1000);
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
module.exports = { initTwitchClients };
