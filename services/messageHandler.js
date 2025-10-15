const { processCommand } = require("./commandProcessor");
const {
  insertLog,
  fetchCommandsRole,
  getCommandResponse,
  fetchSetting,
     BotUsername,
     fetchDefaultCommand,
      } = require("./database");
const { changeGame } = require("./ChangeGame");
// const {  sendWelcomeMessage } = require("./welcomeMessageSentUsers");
const { TimerCommand } = require("./commands/TimerCommand");
const { changeStreamTitle } = require("./commands/ChangeTitle");
const { handleMessageLevel, MessageLevel, topLevelShow } = require("./commands/level");
const { getUserRoles, getAllowedRolesForCommand } = require("./rolePermissions");
const { badwordDelete } = require("./badword");
const { handleExistingCommands } = require("./commandHandler");
const { CommandTimer } = require("./commandTimer");
const { getChannelData } = require("../utils/getChannelData");
const { handleFollowCount } = require("../utils/handleFollowCount");
const { handleViewCount } = require("../utils/handleViewCount");
const { handleAccountAge } = require("../utils/handleAccountAge");
const { getFollowAge } = require("../utils/followAge");
const { handleTimeStream } = require("../utils/handleTimeStream");

const activeTimers = new Map();

async function MessageHandler(apiClient,channelName,message, msg, channelCommands,  chatClient,userId,username,channelId,isBot) {
   
    
      const user = await apiClient.users.getUserById(userId);
      const dataChannel = await getChannelData(channelId, apiClient);
    const displayName= user.displayName


  const currentTime = Date.now();
if (!isBot) {
  await badwordDelete( message, username,channelId,userId,msg,apiClient);

  await handleMessageLevel(userId,channelId,currentTime,username,message,chatClient,channelName);
} else {
  // لو حاب تحط شيء للبوت، ممكن هنا
  console.log(`Message from bot ${username} ignored`);
}


 await CommandTimer(chatClient,channelName,message)

  const commandParts = message.trim().split(" ");
  const commandName = commandParts[0].toLowerCase(); 


  const responseText = await getCommandResponse(commandName, channelId);
  // await sendWelcomeMessage(connection ,client,channelName,username, channelId,channelName,userId)
  const infoCom = await fetchCommandsRole( channelId);

   const roles = await getUserRoles(msg)
   const userRoleIds =  roles.roleIds
  


  await insertLog( channelId, username, message, 5, userId,isBot);

  const def_com = await fetchDefaultCommand(channelId);

    
  let matchingAction = def_com.find((action) => commandName === action.action) || def_com.find((action) => commandName === action.default);
  if (matchingAction) { const allowedRoles = getAllowedRolesForCommand(matchingAction.role_id);    
      const isTitleOrGame = matchingAction.config_id === 7 || matchingAction.config_id === 8;
      const isTryingToModify = message.trim().split(" ").length > 1;

     
    if (!userRoleIds.some((roleId) => allowedRoles.includes(roleId))) {
      if (isTitleOrGame && !isTryingToModify) {
      } else {
        
        // chatClient.say(channelName, `@${username}, you do not have permission to use this command.`);
        await insertLog(channelId, username, `Unauthorized command attempt: ${message}`, 7, userId);
        return;
      }
    }


    
    
    
    if (matchingAction && matchingAction.config_id) {
      switch (matchingAction.config_id) {
      case 6: //#timer = 1
        if (await fetchSetting(channelId, 6)) return;

        
        await TimerCommand(channelName,channelId,message,username,userId,chatClient,activeTimers,isBot);
      break;
      case 3: //#level = 3
          if ( await fetchSetting(channelId, 3)) return ;   
       
        if (isBot) {
          return `⚠️ المستخدم ${username} هو بوت، لا يمكن متابعة العملية.`;
        }

          await MessageLevel(channelName,channelId,userId,username,chatClient,isBot)
      break;

      case 7: //#game = 7
          const args2 = message.slice(7);

            if (!args2) {
            const msg = 1 === 2 ? `🎮 اللعبة الحالية هي:\n「${dataChannel.channelGame || "غير محددة"}」` : `🎮 Current game is:\n「${dataChannel.channelGame || "Not set"}」`;
            chatClient.say(channelName, msg);
          } else {
            if ( await fetchSetting(channelId, 7)) return ;

          await changeGame(args2,  channelName,channelId,username,chatClient,userId,isBot,apiClient,1);
          }
      break;
      case 8: //#title = 8

          const args4 = message.slice(7).trim(); 

          if (!args4) {
            const msg = 1 === 2 ? ` عنوان البث الحالي هو:\n「${dataChannel.channelTitle}」`: ` Current stream title:\n「${dataChannel.channelTitle}」`;
            chatClient.say(channelName, msg);
          } else {
            if (await fetchSetting(channelId, 8)) return;

            await changeStreamTitle(chatClient, channelId, channelName, username, userId, args4, apiClient, isBot, 1, dataChannel);
          }
      break;
      case 11: //#follow = 11
            if (await fetchSetting(channelId, 11)) {return}
            await handleFollowCount(chatClient, channelName, username, dataChannel,1)
      break;
   
      case 12: //#age = 12
            if (await fetchSetting(channelId, 12)) {return}
          await handleAccountAge(chatClient, channelName, username, message, apiClient, 1);
      break;
      case 13: //#view = 13
            if (await fetchSetting(channelId, 13)) {return}
          await handleViewCount(chatClient, channelName, username, dataChannel,1)
      break;
      case 14: //#followage = 14
            if (await fetchSetting(channelId, 14)) {return}
        await getFollowAge(chatClient,channelName, username,1);
        break
               case 15: //#time = 15
            if (await fetchSetting(channelId, 15)) {return}
        await handleTimeStream(chatClient, channelName, username, dataChannel,1);
      break;
            case 16: //#toplevel = 16
          if (await fetchSetting(channelId, 16)) return; 
          const leaderboardTemplate = "🏆 Top Users:\n🥇 First: $[user1]\n🥈 Second: $[user2]\n🥉 Third: $[user3]";
          try {
            const formattedResponse = await topLevelShow(leaderboardTemplate, channelId);
            chatClient.say(channelName, formattedResponse); 
          } catch (err) {
            console.error("Error handling #toplevel command:", err);
          }
      break;
      }
    }
  }

  await handleExistingCommands(chatClient,channelName,userId,username,displayName,commandName,infoCom,channelId,responseText,isBot,userRoleIds,dataChannel,message);
  await processCommand(chatClient,channelId,channelName,userId,username,message,channelCommands,userRoleIds,isBot,2);
}
module.exports = { MessageHandler };
