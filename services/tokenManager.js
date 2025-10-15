const fetch = require('node-fetch');
const { saveTokenToDB } = require('./database');
require('dotenv').config({ debug: false });

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;



async function isTokenValid(accessToken) {
  try {
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${accessToken}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function refreshToken(tokenData) {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', tokenData.refreshToken);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: params
  });

  const data = await res.json();

  if (!data.access_token) {
    console.error('❌ Failed to refresh token22:', data);
    return;
  }

  const updated = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokenData.refreshToken,
    expiresIn: data.expires_in,
    obtainmentTimestamp: Date.now()
  };
  await saveTokenToDB(updated);
  console.log('✅ Token refreshed.');
  return updated;
}


module.exports ={}
