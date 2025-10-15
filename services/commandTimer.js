const { getChannelInfoById, getCommandTimerById } = require("./database");
const chatLines = {};
const timers = {};
async function CommandTimer(chatClient, channelName, message) {
  const channelInfo = await getChannelInfoById(channelName);
  if (!chatLines[channelName]) {
    chatLines[channelName] = {};
  }
  if (!timers[channelName]) {
    timers[channelName] = {};
  }

  if (!channelInfo) {
    console.warn(`No channel info found for channel: ${channelName}`);
    return;
  }

  const messageConfigs = await getCommandTimerById(channelInfo.channelId);

  
  if (message && message.trim() === '#timer cancel') {
    const activeTimers = timers[channelName];
    if (activeTimers && Object.keys(activeTimers).length > 0) {
      Object.keys(activeTimers).forEach(commandId => {
        clearTimeout(activeTimers[commandId]);
        delete activeTimers[commandId]; // Remove timer reference
      });
      chatClient.say(channelName, `All timers have been canceled. You can set a new timer now.`);
    } 
    return; 
  }

  messageConfigs.forEach((config) => {
    const commandId = config.COMMAND_ID;
    
if (message && message.trim() === `!${config.COMMAND}`) {
  chatClient.say(channelName, config.MESSAGE);
  chatLines[channelName][commandId] = 0;
  delete timers[channelName][commandId]; 
  return; 
}
    if (!chatLines[channelName][commandId]) {
      chatLines[channelName][commandId] = 0;
    }
    chatLines[channelName][commandId]++;

    if (chatLines[channelName][commandId] >= config.CHAT_LINES) {
      if (!timers[channelName][commandId]) {
          
        timers[channelName][commandId] = setTimeout(() => {
          chatClient.say(channelName, config.MESSAGE);
          chatLines[channelName][commandId] = 0; // Reset chat line count
          delete timers[channelName][commandId]; // Clear the timer
        }, config.INTERVAL_MINUTES * 60 * 1000); // Adjust timing as necessary
      }
    }
  });
}

module.exports = { CommandTimer };
