const axios = require("axios");
const {
  fetchBadWordsByChannelId,
  getChannelInfo,
  insertLog,
} = require("./database");

async function badwordDelete( message, username,channelId,userId,msg,apiClient) {
  
  let channelInfo;

  // لا تحذف رسالة صاحب القناة
  if (userId === channelId) {
    return;
  }

  try {
    channelInfo = await getChannelInfo(channelId);
  } catch (error) {
    console.error("Error fetching channel info:", error);
    return;
  }

  // جلب الكلمات الممنوعة من قاعدة البيانات
  
  let badWords = [];
  try {
    badWords = await fetchBadWordsByChannelId(channelId);
  } catch (error) {
    console.error("Error fetching bad words:", error);
    return;
  }

  // تقسيم الكلمات الممنوعة في مصفوفة
  const badWordsArray = badWords.flatMap((entry) =>
    (entry.words || "") // يتجنب null أو undefined
      .split(":")
      .map((word) => word.trim())
      .filter((word) => word)
  );

  // التحقق من وجود كلمة ممنوعة في الرسالة
  const containsBadWord = badWordsArray.some((word) =>
    message.toLowerCase().includes(word.toLowerCase())
  );

  if (containsBadWord) {
    const messageId = msg.id;
    try {
      await deleteMessage(channelId, messageId);
      await insertLog(
        channelId,
        username,
        `Message deleted for bad word: ${message}`,
        3,
        userId
      );
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  }

    async function deleteMessage(broadcasterId, messageId) {
    try {
      await apiClient.moderation.deleteChatMessages(
        broadcasterId,
        messageId
      );
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
    
    }

}

module.exports = { badwordDelete };
