const { AllRefresh, updateTokenInDB, updateTokenInDBBot } = require('./Token');

async function refreshTwitchToken(refreshToken) {
  try {
    const url = new URL('https://id.twitch.tv/oauth2/token');
    url.search = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'deqybkr1dneblsup8drmt0nbxldw9x',
      client_secret: 'h2dwseb7zqhje61lxnmqpnlrsqu65m'
    });

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('❌ Failed to refresh token:', err.message);
    return null;
  }
}

async function checkAndRefreshTokens(userTokens, botTokens) {
  console.log('\n==============================');
  console.log(`🔄 Starting token refresh at ${new Date().toLocaleString()}`);
  console.log('==============================\n');

  const allPromises = [
    ...userTokens.map(async channel => {
      console.log(`🟦 Refreshing token for channel: ${channel.channelId}`);
      const newTokens = await refreshTwitchToken(channel.refreshToken);
      if (newTokens) await updateTokenInDB(channel.channelId, newTokens.access_token, newTokens.refresh_token);
    }),
    ...botTokens.map(async bot => {
      console.log(`🟪 Refreshing BOT token: ${bot.id}`);
      const newTokens = await refreshTwitchToken(bot.refreshToken);
      if (newTokens) await updateTokenInDBBot(bot.id, newTokens.access_token, newTokens.refresh_token);
    })
  ];

  await Promise.all(allPromises);

  console.log(`✅ Token refresh completed at ${new Date().toLocaleString()}`);
  console.log('==============================\n');
}

(async () => {
  const intervalMs = 30 * 60 * 1000;

  const { userTokens, botTokens } = await AllRefresh();
  if ((!userTokens || !userTokens.length) && (!botTokens || !botTokens.length)) {
    console.log("❌ لا يوجد قنوات أو بوتات مفعّلة للتجديد.");
    return;
  }

  await checkAndRefreshTokens(userTokens, botTokens);

  setInterval(async () => {
    console.log('\n⏳ Refreshing tokens now...');
    const { userTokens, botTokens } = await AllRefresh();
    await checkAndRefreshTokens(userTokens, botTokens);
  }, intervalMs);
})();
