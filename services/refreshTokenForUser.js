const fetch = require('node-fetch');
const dotenv = require('dotenv');
const { getJoinedChannels, updateTokenInDB } = require('./database');

dotenv.config();

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

async function refreshTokenByChannelName(channelName) {
  try {
    const result = await getJoinedChannels();
    const allUsers = result.channelHasJoin || [];

    const user = allUsers.find(
      u => u.channel.toLowerCase() === channelName.toLowerCase()
    );

    if (!user) {
      console.log(`❌ لم يتم العثور على مستخدم باسم القناة: ${channelName}`);
      return;
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', user.refresh_token);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: params
    });

    const data = await res.json();

    if (!data.access_token) {
      console.error(`❌ فشل تحديث التوكن لـ ${user.channel}:`, data);
      return;
    }
      
    const updatedToken = {
      channelId: user.channel_id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || user.refresh_token,
      expiresAt: data.expires_in,
      obtainmentTimestamp: Date.now()
    };

    await updateTokenInDB(updatedToken);
    console.log(`✅ تم تحديث التوكن لـ ${user.channel}`);
  } catch (err) {
    console.error(`❌ خطأ في تحديث التوكن لـ ${channelName}:`, err.message);
  }
}

module.exports = { refreshTokenByChannelName };
