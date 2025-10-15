const {
  fetchActions,
  fetchCommand,
  addCommand,
  updateCommand,
  deleteCommand,
  insertLog,
  fetchBotStatus, // أضف هذا السطر
} = require("./database");

const { getAllowedRolesForCommand } = require("./rolePermissions");

async function processCommand(chatClient, channelId, channelName, userId, username, message, channelCommands, userRoleIds, isBot,status) {
  const commandName = message.trim().toLowerCase();

  try {
   
    const lang = status === 2 ? "ar" : "en";

    const actions = await fetchActions(channelId);
    if (!actions || actions.length === 0) return;

    let matchingAction =
      actions.find((action) => commandName.startsWith(action.action)) ||
      actions.find((action) => commandName.startsWith(action.default));

    if (matchingAction) {
      const allowedRoles = getAllowedRolesForCommand(matchingAction.role_id);
      if (!userRoleIds.some((roleId) => allowedRoles.includes(roleId))) {
        // chatClient.say(channelName, lang === "ar"
        //   ? `@${username} 🚫 ليس لديك صلاحية استخدام هذا الأمر.`
        //   : `@${username} 🚫 You don't have permission to use this command.`);
        await insertLog(channelId, username, `Unauthorized command attempt: ${message}`, 7, userId, isBot);
        return;
      }

      const args = message.split(" ");
      if (args.length < 2) return;

      const commandKey = args[1].toLowerCase();
      let response = args.slice(2).join(" ");
      const currentDate = new Date();
      const formattedDateTime = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

      let resultMessage = "";

      switch (matchingAction.action_id) {
        case 1: // add
          const exists = await fetchCommand(channelId, commandKey);
          if (exists) {
            resultMessage = lang === "ar"
              ? `⚠️ الكوماند "${commandKey}" موجود بالفعل.`
              : `⚠️ The command "${commandKey}" already exists.`;
            break;
          }

          if (!response || response.trim() === "") {
            resultMessage = lang === "ar"
              ? `⚠️ يرجى إدخال رد للكوماند "${commandKey}".`
              : `⚠️ Please provide a response for the command "${commandKey}".`;
            break;
          }

          await addCommand(channelId, channelName, commandKey, response, 5, formattedDateTime, username, 1);
          await insertLog(channelId, username, `تمت إضافة الكوماند ${commandKey}`, 1, userId, isBot);
          if (!channelCommands[channelName]) channelCommands[channelName] = {};
          channelCommands[channelName][commandKey] = response;

          resultMessage = lang === "ar"
            ? `✅ تم إضافة الكوماند "${commandKey}" بنجاح.`
            : `✅ Command "${commandKey}" has been added successfully.`;
          break;

        case 2: // edit
          const existsEdit = await fetchCommand(channelId, commandKey);
          if (!existsEdit) {
            resultMessage = lang === "ar"
              ? `⚠️ الكوماند "${commandKey}" غير موجود.`
              : `⚠️ Command "${commandKey}" does not exist.`;
            break;
          }

          await updateCommand(channelId, commandKey, response, formattedDateTime, username);
          await insertLog(channelId, username, `تم تعديل رد الكوماند ${commandKey}`, 2, userId, isBot);
          if (channelCommands[channelName]) {
            channelCommands[channelName][commandKey] = response;
          }

          resultMessage = lang === "ar"
            ? `✅ تم تعديل الكوماند "${commandKey}".`
            : `✅ Command "${commandKey}" has been updated.`;
          break;

        case 3: // delete
          const deleted = await deleteCommand(channelId, commandKey);
          await insertLog(channelId, username, `تم حذف الكوماند ${commandKey}`, 3, userId, isBot);

          if (deleted) {
            if (channelCommands[channelName]?.[commandKey]) {
              delete channelCommands[channelName][commandKey];
            }

            resultMessage = lang === "ar"
              ? `🗑️ تم حذف الكوماند "${commandKey}".`
              : `🗑️ Command "${commandKey}" has been deleted.`;
          } else {
            resultMessage = lang === "ar"
              ? `⚠️ فشل في حذف الكوماند "${commandKey}".`
              : `⚠️ Failed to delete command "${commandKey}".`;
          }
          break;
      }

      if (resultMessage) {
        chatClient.say(channelName, resultMessage);
      }
    }
  } catch (error) {
    console.error(`❌ Error in processCommand:`, error);
    // chatClient.say(channelName, `❌ ${error.message}`);
  }
}

module.exports = { processCommand };
