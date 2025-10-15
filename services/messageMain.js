const {
  saveMessageToDB,
  fetchCommands,
  BotUsername,
  logUserLiveMessage,
} = require("./database");
const { initializeAllApiClients, getApiClient } = require("./apiClients");
const { MessageHandler } = require("./messageHandler");
const { getChannelData } = require("../utils/getChannelData");
const { default: Redis } = require("ioredis");
const { AppDataSource } = require("../data-source");
const redis = new Redis();
module.exports = async function messageMain(
  chatClient,
  channelName,
  user,
  message,
  msg
) {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await initializeAllApiClients();

  const apiClient = getApiClient(channelName);

  if (apiClient) {
    // console.log(`✅ ApiClient للقناة "${channelName}" جاهز للاستخدام`);
  } else {
    console.log(`❌ ApiClient للقناة "${channelName}" غير موجود`);
  }
  const handleMessage = async (client) => {
    const broadcaster = await client.users.getUserByName(channelName);
    const userinfo = await client.users.getUserByName(user);

    const channelId = broadcaster?.id;
    const userId = userinfo?.id;
    const username = userinfo?.name;

    const isBot = await BotUsername(username, channelId);
    if (isBot) {
      return `⚠️ المستخدم ${username} هو بوت، لا يمكن متابعة العملية.`;
    }

    const channelCommands = await fetchCommands(channelName);
    const dataChannel = await getChannelData(channelId, apiClient);
    console.log(`💬 [${channelName}] ${user}: ${message}`);
    const isStream = await apiClient.streams.getStreamByUserId(channelId);

    if (isStream) {
      await logUserLiveMessage(msg, channelId, dataChannel);

      await redis.sadd(`viewers:${channelId}`, userId);
      await redis.hset(`viewer_names:${channelId}`, userId, username);
    }
    await saveMessageToDB(
      msg,
      channelId,
      channelName,
      message,
      dataChannel,
      isStream
    );

    await MessageHandler(
      client,
      channelName,
      message,
      msg,
      channelCommands,
      chatClient,
      userId,
      username,
      channelId,
      isBot
    );
  };

  try {
    await handleMessage(apiClient);
  } catch (err) {
    console.error("❌ خطأ في معالجة الرسالة");
    console.error("📄 الرسالة:", err.message);
    console.error("📍 التفاصيل:", err.stack);
  }
};
