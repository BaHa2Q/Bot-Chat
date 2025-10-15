const {updateUserXP, fetchSetting, insertLog, getUserLevel, topLevel, BotUsername } = require("../database");
const {
  spamMessageInterval,
  spamMessageThreshold,
  commandDelay,
} = require("../config");

let messageHistory = new Map();
let lastCommandTime = new Map();


async function handleMessageLevel(userId,channelId,currentTime,username,message,chatClient,channelName) {

     const isBot = await BotUsername(username, channelId);
     if (isBot) return; // Ignore bot users


     
  if (userId === channelId) return;
  
  if (!messageHistory.has(userId)) {
    messageHistory.set(userId, []);
  }

  if (!lastCommandTime.has(userId)) {
    lastCommandTime.set(userId, 0);
  }

  const userMessages = messageHistory.get(userId);
  userMessages.push({ time: currentTime, message });
  messageHistory.set(userId, userMessages);

  
  const filteredMessages = userMessages.filter(
    (msg) => currentTime - msg.time <= spamMessageInterval
  );
  messageHistory.set(userId, filteredMessages);
  const lastTime = lastCommandTime.get(userId) || 0;

  if (
    filteredMessages.length > spamMessageThreshold &&
    filteredMessages.every((msg) => msg.message === filteredMessages[0].message)

  ) {
    return;
  }
  if (currentTime - lastTime < commandDelay) {
    return;
  }
  
  lastCommandTime.set(userId, currentTime);
  
  try {
    await updateUserXP(userId, channelId,username, 6, chatClient, channelName);
  } catch (error) {
    console.error(error);
  }
  
}
async function topLevelShow(responseTemplate, channelId) {
  try {
    const usernames = await topLevel(channelId);

const Top1 = usernames[0] || "—";
const Top2 = usernames[1] || "—";
const Top3 = usernames[2] || "—";
    let response = responseTemplate.replace(/\$\[user1\]/g, `${Top1}`);
    response = response.replace(/\$\[user2\]/g, `${Top2}`);
    response = response.replace(/\$\[user3\]/g, `${Top3}`);
    return response;
  } catch (err) {
    console.error("Error generating top username response:", err);
    return responseTemplate;
  }
}
async function MessageLevel (channel,channelId,userId,username,client)  {
  try {

    if (userId === channelId) {
      return
    }
    // Fetch user level and XP information
    const { currentXP, currentLevel, goalXP, nextLevel, xpToNextLevel } = await getUserLevel(userId, channelId);
  const responseTemplate = 
`🌟  المستوى: (${currentLevel}) - الخبرة: (${goalXP}/${currentXP}) 🚀✨ ${username}`
    client.say(channel, responseTemplate);
  } catch (error) {
    
    await insertLog(channelId,username,`${username}, there was an error retrieving your level information.`,7,userId);
  }
}

module.exports = { handleMessageLevel, messageHistory,MessageLevel,topLevelShow, lastCommandTime };







