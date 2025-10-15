const {
  getUserRoles,
  getAllowedRolesForCommand,
} = require("./rolePermissions");
const { insertLog, fetchSetting } = require("./database"); // Import the function to insert logs

// Function to send messages with a delay
function sendMessageWithDelay(
  chatClient,
  channel,
  message,
  delay,
  channelId,
  user,
  commandName,
  userId,
  isBot
) {
  setTimeout(() => {
    insertLog(channelId, user, commandName, 10, userId, isBot);
    chatClient.say(channel, message).catch(console.error);
  }, delay);
}

let showMessageResponse = true;
const userLastCommandTime = new Map();
const userLastCommand = new Map();

async function handleExistingCommands(
  chatClient,
  channelName,
  userId,
  username,
  displayName,
  commandName,
  infoCom,
  channelId,
  responseText,
  isBot,
  userRoleIds,
  dataChannel,
  message
) {
  const IsEnabled = await fetchSetting(channelId, 1);
  const IsDelay = await fetchSetting(channelId, 2);

  if (IsEnabled) {
    return;
  }
  if (!responseText) {
    return;
  }

  // Find the matching action for the command
  let matchingAction = infoCom.find((action) =>
    commandName.startsWith(action.commandName.toLowerCase())
  );

  if (!matchingAction) {
    return; // No matching action found
  }

  const allowedRoles = getAllowedRolesForCommand(matchingAction.role_id);

  if (!userRoleIds.some((roleId) => allowedRoles.includes(roleId))) {
    await insertLog(
      channelId,
      username,
      `Unauthorized command attempt: ${commandName}`,
      7,
      userId,
      isBot
    );
    return;
  }

  let response = responseText;

  function replaceEvalExpressions(text) {
    let result = "";
    let cursor = 0;

    while (true) {
      const startIndex = text.indexOf("$[eval", cursor);
      if (startIndex === -1) {
        result += text.slice(cursor);
        break;
      }
      result += text.slice(cursor, startIndex);

      let openBracketIndex = text.indexOf("[", startIndex);
      if (openBracketIndex === -1) {
        // لا يوجد "[", أضف الباقي وانهِ
        result += text.slice(startIndex);
        break;
      }

      // نبحث عن الـ "]" المطابق الذي يغلق الـ "$[eval ..."
      let bracketCount = 1;
      let endIndex = openBracketIndex + 1;

      while (endIndex < text.length && bracketCount > 0) {
        if (text[endIndex] === "[") bracketCount++;
        else if (text[endIndex] === "]") bracketCount--;
        endIndex++;
      }

      if (bracketCount !== 0) {
        // القوس لم يُغلق بشكل صحيح
        result += text.slice(startIndex);
        break;
      }

      // نص الكود بين $[eval و ]
      const code = text.slice(startIndex + 6, endIndex - 1).trim();

      // نفّذ الكود داخل try catch
      let evalResult = "";
      try {
        const func = new Function(`"use strict"; ${code}`);
        const val = func();
        evalResult = val === undefined ? "" : val.toString();
      } catch (e) {
        console.error("Error evaluating code:", e.message);
        evalResult = "Error evaluating expression";
      }

      result += evalResult;
      cursor = endIndex;
    }
    return result;
  }

  response = replaceEvalExpressions(responseText);

  const currentDate = new Date();
  const formattedDateTime = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;
  const formattedDate = `${currentDate.toLocaleDateString()}`;
  const formattedTime = `${currentDate.toLocaleTimeString()}`;
  response = response.replace(/\$\[userName\]/gi, `@${username} `);
  response = response.replace(/\$\[command\]/gi, `${commandName}`);
  response = response.replace(/\$\[channelName\]/gi, `@${channelName}`);
  response = response.replace(/\$\[displayName\]/gi, `@${displayName}`);
  response = response.replace(/\$\[dateTime\]/gi, `${formattedDateTime} `);
  response = response.replace(/\$\[Date\]/gi, `${formattedDate} `);
  response = response.replace(/\$\[Time\]/gi, `${formattedTime} `);
  response = response.replace(
    /\$\[channelUptime\]/gi,
    `${dataChannel.channelUptime}`
  );
  response = response.replace(
    /\$\[channelFollowers\]/gi,
    `${dataChannel.channelFollowers}`
  );
  response = response.replace(
    /\$\[channelViewers\]/gi,
    `${dataChannel.channelViewers}`
  );
  response = response.replace(
    /\$\[twitter=([^\]]+)\]/gi,
    (_, username) => `https://twitter.com/${username}`
  );
  response = response.replace(
    /\$\[instagram=([^\]]+)\]/gi,
    (_, username) => `https://instagram.com/${username}`
  );
  response = response.replace(
    /\$\[tiktok=([^\]]+)\]/gi,
    (_, username) => `https://www.tiktok.com/@${username}`
  );
  response = response.replace(
    /\$\[youtube=([^\]]+)\]/gi,
    (_, username) => `https://www.youtube.com/@${username}`
  );
  response = response.replace(
    /\$\[discord=\{(.+?)\}\]/gi,
    (_, invite) => `https://discord.gg/${invite}`
  );
  response = response.replace(/\$\[Game\]/gi, `${dataChannel.channelGame}`);
  response = response.replace(/\$\[Title\]/gi, `${dataChannel.channelTitle}`);
  const currentTime = Date.now();
  const delayDuration = 20000;

  if (!userLastCommandTime.has(username)) {
    userLastCommandTime.set(username, new Map());
  }
  const userCommandTimes = userLastCommandTime.get(username);

  if (userLastCommand.get(username) === commandName) {
    const lastCommandTime = userCommandTimes.get(commandName) || 0;
    if (currentTime - lastCommandTime < delayDuration) {
      return; // Abort if command is used again too soon
    }
  }

  userCommandTimes.set(commandName, currentTime);
  userLastCommand.set(username, commandName);

  const lowerMessage = message.toLowerCase();
  const lowerCommand = commandName.toLowerCase();
  const indexAfterCommand =
    lowerMessage.indexOf(lowerCommand) + lowerCommand.length;
  let afterCommand = message.slice(indexAfterCommand).trim();

  // استبدال $[query] دائماً، حتى لو لا يوجد نص بعد الأمر
  response = response.replace(/\$\[query\]/gi, afterCommand || "");

  // Send the response message
  if (showMessageResponse) {
    sendMessageWithDelay(
      chatClient,
      channelName,
      response,
      0,
      channelId,
      username,
      commandName,
      userId,
      isBot
    );
  }
  // Log the command usage
  await insertLog(
    channelId,
    username,
    `${commandName} = ${responseText}`,
    8,
    userId,
    isBot
  );
}

module.exports = {
  handleExistingCommands,
};
