const { log } = require("console");

async function getChannelData(userId, apiClient) {
  const data = {
    channelUptime: 'البث غير مباشر',
    channelFollowers: '0',
    channelViewers: '0',
    channelGame: '',
    channelTitle: '',
    streamId: null // 🆔 نضيف streamId هنا
  };

  const stream = await apiClient.streams.getStreamByUserId(userId);
  const channelInfo = await apiClient.channels.getChannelInfoById(userId);

  // 🎮 اسم اللعبة
  data.channelGame = channelInfo.gameName || '';

  // 📝 عنوان البث
  data.channelTitle = channelInfo.title || '';

  if (stream) {
    // 🆔 stream id
    data.streamId = stream.id;

    // 🕒 uptime
    const start = new Date(stream.startDate);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    data.channelUptime = `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // 👁️ current live viewers
    data.channelViewers = stream.viewers.toLocaleString();
  }

  // 👥 total followers
  const followers = await apiClient.channels.getChannelFollowerCount(userId);
  data.channelFollowers = followers.toLocaleString();

  return data;
}

module.exports = { getChannelData };
