const axios = require('axios');
const { insertLog } = require('../database');

// Function to change the Twitch stream title

async function changeStreamTitle(chatClient,channelId,channelName,username,userId,title,apiClient,isBot,status) {    
  
  try {
    await apiClient.channels.updateChannelInfo(channelId, {title: title});

    // ✅ رد بحسب اللغة
    const msg = status === 2 ? `✅ تم تغيير العنوان إلى: "${title}"` : `✅ Stream title changed to: "${title}"`;

    chatClient.say(channelName, msg);

    await insertLog(channelId, username, `Title changed to: ${title}`, 9, userId, isBot);

  } catch (error) {
    // ❌ رسالة خطأ بحسب اللغة
    const msg = status === 2
      ? '❌ حدث خطأ أثناء محاولة تغيير العنوان.'
      : '❌ An error occurred while trying to change the title.';

    // chatClient.say(channelName, msg);

    await insertLog(channelId, username, `Failed to change title: ${title}`, 7, userId, isBot);
  }
}
module.exports = { changeStreamTitle };
