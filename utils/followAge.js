const fetch = require('node-fetch');

async function getFollowAge(chatClient, channel, user, status) {
  const url = `https://commands.garretcharp.com/twitch/followage/${channel}/${user}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {

      return;
    }
    const text = await res.text();

    if (text.includes('In order to use this API the streamer must login to the application')) {
      await chatClient.say(channel, status === 1
        ? `⚠️ The streamer must login: https://commands.garretcharp.com/`
        : `⚠️ لازم صاحب القناة يسوي تسجيل دخول: https://commands.garretcharp.com/`);
      return;
    }

    await chatClient.say(channel, status === 1
      ? `Follow duration: ${text}`
      : `مدة المتابعة: ${text}`);
  } catch (error) {
    console.error(error);
  }
}

module.exports = { getFollowAge };
