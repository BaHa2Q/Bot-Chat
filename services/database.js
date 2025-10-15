// Import OracleDB module
const { AppDataSource } = require("../data-source");
const { v4: uuidv4 } = require("uuid");
const { UserLiveMessages } = require("../entities/UserLiveMessagesModel");
const { Messages } = require("../entities/MessagesModel");
const { UserJoins } = require("../entities/UserJoinsModel");
const {
  VwActiveUserTokensInfo,
} = require("../entities/VwActiveUserTokensInfoModel");
const { BotTokens } = require("../entities/BotTokensModel");
const { Commands } = require("../entities/CommandsModel");
const { UserChannels } = require("../entities/UserChannelsModel");
const { CommandTimer } = require("../entities/CommandTimerModel");
const { UserTokens } = require("../entities/UserTokensModel");
const { CommandConfig } = require("../entities/CommandConfigModel");
const { BotLogs } = require("../entities/BotLogsModel");
const { UserConfig } = require("../entities/UserConfigModel");
const { BadWordsList } = require("../entities/BadWordsListModel");
const { UserLevels } = require("../entities/UserLevelsModel");
const { Bots } = require("../entities/BotsModel");
const { Between } = require("typeorm");
const { CommandDefault } = require("../entities/CommandDefaultModel");

async function logUserLiveMessage(msg, channelId, dataChannel) {
  const repo = AppDataSource.getRepository(UserLiveMessages);
  const userId = msg.userInfo.userId;
  const username = msg.userInfo.userName;
  const streamId = dataChannel?.streamId;

  const messageDate = new Date(msg.date);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  try {
    const existing = await repo.findOne({
      where: {
        userId,
        channelId,
        messageDate: Between(todayStart, todayEnd),platformId
      },
    });

    if (!existing) {
      const newEntry = repo.create({
        userId,
        channelId,
        username,
        streamId,
        messageDate,
        platformId:1
      });

      await repo.save(newEntry);
      console.log(
        `✅ تم تسجيل رسالة المستخدم ${username} في القناة ${channelId}`
      );
    }
  } catch (err) {
    console.error("❌ خطأ أثناء تسجيل الرسالة:", err);
  }
}

async function saveMessageToDB(
  msg,
  channelId,
  channelName,
  message,
  dataChannel
) {
  const repo = AppDataSource.getRepository(Messages);

  try {
    const messageText = message.replace(/^@\S+\s*/, ""); // Remove @username at the start

    const newMessage = repo.create({
      id: msg.id,
      channelId,
      channelName,
      userId: msg.userInfo.userId,
      username: msg.userInfo.userName,
      displayName: msg.userInfo.displayName,
      messageText,
      messageDate: new Date(msg.date),
      threadId: msg.threadMessageId || null,
      parentId: msg.parentMessageId || null,
      parentUsername: msg.parentMessageUserName || null,
      parentText: msg.parentMessageText || null,
      streamId: dataChannel?.streamId || null,
      color: msg.userInfo.color,
        platformId:1
    });

    await repo.save(newMessage);
  } catch (err) {
    console.error("❌ Failed to save message to DB:", err);
  }
}
async function UserJoinChannelToDay(channelId, channelName, username) {
  const repo = AppDataSource.getRepository(UserJoins);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // تصفير الوقت عشان نستخدمه للمقارنة

    const existing = await repo
      .createQueryBuilder("uj")
      .where("uj.channelId = :channelId", { channelId })
      .andWhere("LOWER(uj.username) = LOWER(:username)", { username })
      .andWhere("TRUNC(uj.joinDate) = TRUNC(:today)", { today })
      .getCount();

    if (existing > 0) return; // المستخدم انضم اليوم بالفعل

    const newJoin = repo.create({
      channelId,
      channelName,
      username,
      joinDate: today,
        platformId:1
    });

    await repo.save(newJoin);

    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .replace(/\..+/, "");
    console.log(
      `🟢 ${username} انضم لأول مرة اليوم إلى ${channelName} - ${timestamp}`
    );
  } catch (err) {
    console.error("❌ Error inserting user join:", err);
  }
}
async function getJoinedChannels() {
  try {
    const activeRepo = AppDataSource.getRepository(VwActiveUserTokensInfo);

    const result = await activeRepo.find({where: {platformId:1}});

    const channelHasJoin = result.map((row) => ({
      channel: row.nameLogin,
      channel_id: row.channelId,
      access_token: row.accessToken,
      refresh_token: row.refreshToken,
      isjoin: row.isJoin,
    }));

    return { channelHasJoin };
  } catch (err) {
    console.error("❌ خطأ أثناء استرجاع القنوات:", err);
    return { channelHasJoin: [] };
  }
}

async function getTokenFromDB() {
  try {
    const repo = AppDataSource.getRepository(BotTokens);
    const row = await repo.findOneBy({ id: 2 });

    return row
      ? {
          accessToken: row.accessToken,
          refreshToken: row.refreshToken,
          expiresIn: row.expiresIn,
        }
      : null;
  } catch (err) {
    console.error("❌ Error fetching token from DB:", err);
    return null;
  }
}

async function saveTokenToDB(tokenData) {
  try {
    const repo = AppDataSource.getRepository(BotTokens);

    // نبحث عن السجل ذي الـ id = 2 (حسب الكود الأصلي)
    let tokenRecord = await repo.findOneBy({ id: 2 });

    if (tokenRecord) {
      // حدث الحقول المطلوبة + تاريخ التحديث
      tokenRecord.accessToken = tokenData.accessToken;
      tokenRecord.refreshToken = tokenData.refreshToken;
      tokenRecord.updatedAt = new Date();

      await repo.save(tokenRecord);
    } else {
      // أنشئ سجل جديد بالـ id = 2
      const newRecord = repo.create({
        id: 2,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        updatedAt: new Date(),
        platformId:1
      });

      await repo.save(newRecord);
    }
  } catch (err) {
    console.error("❌ Error saving token to DB:", err);
  }
}

async function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

async function getCommandResponse(commandName, channelId) {
  try {
    const repo = AppDataSource.getRepository(Commands);

    const command = await repo
      .createQueryBuilder("cmd")
      .where("LOWER(cmd.commandName) = :commandName", {
        commandName: commandName.toLowerCase(),
      })
      .andWhere("cmd.channelId = :channelId", { channelId })
      .andWhere("cmd.active = 1")
      .andWhere("cmd.platformId = :platformId", { platformId: 1 }) // ← الفلتر الجديد
      .getOne();

    return command ? command.responseText : null;
  } catch (err) {
    console.error("Error querying database:", err);
    return null;
  }
}
async function getChannelInfoById(channelName) {
  try {
    const repo = AppDataSource.getRepository(UserChannels);

    const channel = await repo.findOneBy({ nameLogin: channelName });

    if (!channel) return null;

    return {
      channelId: channel.channelId,
      channelName: channel.nameLogin,
    };
  } catch (err) {
    console.error("Error fetching channel By Id info:", err);
    throw err;
  }
}
async function getCommandTimerById(channelId) {
  try {
    const repo = AppDataSource.getRepository(CommandTimer);

    const timers = await repo.find({
      where: { channelId, status: 1,platformId:1 },
    });

    return timers.map((timer) => ({
      COMMAND_ID: timer.command,
      CHANNEL_ID: timer.channelId,
      COMMAND: timer.command,
      NAME: timer.name,
      MESSAGE: timer.message,
      INTERVAL_MINUTES: timer.intervalMinutes,
      CHAT_LINES: timer.chatLines,
      STATUS: timer.status,
      CREATED_AT: timer.createdAt,
    }));
  } catch (err) {
    console.error("Error fetching channel info Timer:", err);
    throw err;
  }
}

async function getChannelInfo(channelId) {
  try {
    const repo = AppDataSource.getRepository(UserTokens);

    const token = await repo.findOneBy({ channelId,platformId:1 });
    if (!token) return null;

    return {
      channelId: token.channelId,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    };
  } catch (err) {
    console.error("Error fetching channel info:", err);
    throw err;
  }
}

async function updateTokenInDB(tokenInfo) {
  try {
    const repo = AppDataSource.getRepository(UserTokens);
    await repo.update(
      { channelId: tokenInfo.channelId },
      {
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken,
        expiresAt: tokenInfo.expiresAt,
        obtainmentTimestamp: tokenInfo.obtainmentTimestamp,
        updatedAt: new Date(),
        platformId:1
      }
    );
  } catch (err) {
    console.error("Error updating token:", err);
    throw err;
  }
}

async function fetchCommands(channelName) {
  try {
    const repo = AppDataSource.getRepository(Commands);
    const commands = await repo.find({
      where: { channelName, platformId: 1 },
      select: ["commandName", "responseText"],
    });
    return commands;
  } catch (error) {
    console.error("Error fetching commands:", error);
    throw error;
  }
}

async function fetchCommand(channelId, commandName) {
  try {
    const repo = AppDataSource.getRepository(Commands);
    const command = await repo.findOneBy({
      channelId,
      commandName,
      platformId: 1,
    });
    return command || null;
  } catch (error) {
    console.error("Error fetching command:", error);
    throw error;
  }
}
async function fetchCommandsRole(channelId) {
  try {
    const repo = AppDataSource.getRepository(Commands);
    const commands = await repo.find({
      where: { channelId, platformId: 1 },
      select: ["commandName", "responseText", "roleId", "delay"],
    });

    return commands.map((cmd) => ({
      commandName: cmd.commandName,
      responseText: cmd.responseText,
      role_id: cmd.roleId,
      delay: cmd.delay,
    }));
  } catch (error) {
    console.error("Error fetching commands:", error);
    throw error;
  }
}

// إضافة أمر جديد مع التحقق من وجوده مسبقاً
async function addCommand(
  channelId,
  channelName,
  commandName,
  responseText,
  roleId,
  createdAt,
  createdBy,
  active
) {
  try {
    const repo = AppDataSource.getRepository(Commands);

    // تحقق إذا الأمر موجود
    const existingCommand = await repo.findOneBy({
      channelId,
      commandName,
      platformId: 1,
    });
    if (existingCommand) {
      throw new Error(
        `Command !${commandName} already exists for ${channelName}!`
      );
    }

    const newCommand = repo.create({
      channelId,
      channelName,
      commandName,
      responseText,
      roleId,
      createdAt,
      createdBy,
      active,
      platformId: 1,
    });

    await repo.save(newCommand);
  } catch (error) {
    console.error("Error adding command:", error);
    throw error;
  }
}

// حذف أمر بواسطة channelId و commandName
async function deleteCommand(channelId, commandName) {
  try {
    const repo = AppDataSource.getRepository(Commands);

    const deleteResult = await repo.delete({
      channelId,
      commandName,
      platformId: 1,
    });
    return deleteResult.affected > 0;
  } catch (error) {
    console.error("Error deleting command:", error);
    throw error;
  }
}

// تحديث نص الأمر وتحديث معلومات التعديل
async function updateCommand(
  channelId,
  commandName,
  responseText,
  updatedAt,
  updatedBy
) {
  try {
    const repo = AppDataSource.getRepository(Commands);

    // باستخدام QueryBuilder لتطبيق LOWER على commandName في الشرط
    const updateResult = await repo
      .createQueryBuilder()
      .update(Commands)
      .set({ responseText, updatedAt, updatedBy })
      .where("channelId = :channelId", { channelId })
      .andWhere("LOWER(commandName) = LOWER(:commandName)", { commandName })
      .andWhere("platformId = :platformId", { platformId: 1 }) // ← الفلتر الجديد
      .execute();

    return updateResult.affected > 0;
  } catch (error) {
    console.error("Error updating command:", error);
    throw error;
  }
}
async function fetchActions(channelId) {
  try {
    const repo = AppDataSource.getRepository(CommandConfig);

    // جلب جميع الأوامر المرتبطة بالقناة
    const actions = await repo
      .createQueryBuilder("c")
      .innerJoin("USER_CHANNELS", "a", "a.CHANNEL_ID = c.CHANNEL_ID")
      .where("c.CHANNEL_ID = :channelId", { channelId })
      .getMany();

    return actions.map((item) => ({
      id: item.id,
      action: item.action,
      channel_id: item.channelId,
      default: item.defaults,
      message: item.message,
      messageerorr: item.errorMessage,
      action_id: item.typeId,
      role_id: item.roleId,
    }));
  } catch (error) {
    console.error("Error fetching actions:", error);
    throw error;
  }
}

async function insertLog(channelId, username, message, typeId, userId, isBot) {
  try {
    const repo = AppDataSource.getRepository(BotLogs);

    const logEntry = repo.create({
      logId: uuidv4(),
      channelId,
      username,
      message,
      typeId,
      userId,
      isBot,
      platformId: 1,
    });

    await repo.save(logEntry);
  } catch (error) {
    console.error("Error inserting log:", error);
    throw error;
  }
}

async function fetchBadWordsByChannelId(channelId) {
  const repo = AppDataSource.getRepository(BadWordsList);
  const badWords = await repo.find({ where: { channelId,platformId:1 } });
  return badWords.map((w) => ({
    id: w.id,
    words: w.words,
  }));
}

async function BotUsername(username, channelId) {
  if (channelId === 975169736) return 0;

  const botRepo = AppDataSource.getRepository(Bots);
  const normalizedUsername = username.toLowerCase();

  const botRecord = await botRepo.findOneBy({ channelId,platformId:1 });
  if (!botRecord || !botRecord.username) return 0;

  const botsList = botRecord.username.split(":").map((b) => b.toLowerCase());

  return botsList.includes(normalizedUsername) ? 1 : 0;
}

async function fetchSetting(channelId, typeId) {
  
  const repo = AppDataSource.getRepository(UserConfig);

  const setting = await repo.findOne({
    where: {
      channelId,
      configId: typeId,
      status: 0,
      platformId: 1,
    },
  });
  
  return setting ? setting : null;
}
async function fetchDefaultCommand(channelId) {
  const commandRepo = AppDataSource.getRepository(CommandDefault);

  const commands = await commandRepo.find({
    relations: ["config"],
    where: {
      config: {
        channelId,
        platformId: 1
      }
    }
  });

  return commands.map(cmd => ({
    id: cmd.id,
    action: cmd.action,
    default: cmd.defaults,
    config_id: cmd.typeId,
    role_id: cmd.config?.roleId || null
  }));
}

function calculateLevel(xp) {
  let level = 0;
  while (getXPForLevel(level) <= xp) {
    level++;
  }
  return level - 1; // Adjust for the loop increment
}
function getXPForLevel(level) {
  return Math.pow(level, 2) * 100; // Example formula
}

async function updateUserXP(
  userId,
  channelId,
  username,
  xpGain,
  chatClient,
  channelName
) {
  const repo = AppDataSource.getRepository(UserLevels);

  try {
    let userLevel = await repo.findOne({ where: { channelId, userId } });

    if (!userLevel) {
      userLevel = repo.create({
        channelId,
        userId,
        username,
        xp: 0,
        levels: 0,
        createAt: new Date(),
        updateAt: new Date(),
        platformId:1
      });
    }

    const newXP = (userLevel.xp || 0) + xpGain;
    let newLevel = calculateLevel(newXP);
    const levelCap = 100;

    if (newLevel > levelCap) {
      newLevel = levelCap;
    }

    const leveledUp = newLevel > (userLevel.levels || 0);

    userLevel.xp = newXP;
    userLevel.levels = newLevel;
    userLevel.username = username;
    if (leveledUp) {
      userLevel.updateAt = new Date();
    }

    await repo.save(userLevel);

    if (leveledUp && chatClient && channelName) {
      const msg = `🎉 المستخدم ${username} ارتقى إلى المستوى ${newLevel}! مبروك!`;
      chatClient.say(channelName, msg);
    }
  } catch (err) {
    console.error("❌ خطأ أثناء تحديث XP والمستوى:", err);
  }
}
async function getUserLevel(userId, channelId) {
  const repo = AppDataSource.getRepository(UserLevels);

  try {
    const userLevel = await repo.findOne({ where: { channelId, userId } });

    const currentXP = userLevel ? userLevel.xp : 0;
    const currentLevel = userLevel ? userLevel.levels : 0;

    const nextLevel = currentLevel + 1;
    const goalXP = getXPForLevel(nextLevel);
    const xpToNextLevel = goalXP - currentXP;

    return { currentXP, currentLevel, goalXP, nextLevel, xpToNextLevel };
  } catch (err) {
    console.error("Error fetching user level:", err);
    throw err;
  }
}
async function topLevel(channelId) {
  const repo = AppDataSource.getRepository(UserLevels);

  try {
    const topUsers = await repo.find({
      where: { channelId,platformId:1 },
      order: { levels: "DESC", xp: "DESC" },
      take: 3,
    });

    return topUsers.map((u) => u.username);
  } catch (err) {
    console.error("Error fetching top usernames:", err);
    throw err;
  }
}

module.exports = {
  fetchBadWordsByChannelId,
  getCommandResponse,
  fetchSetting,
  getUserLevel,
  updateUserXP,
  fetchActions,
  insertLog,
  deleteCommand,
  updateCommand,
  fetchCommand,
  getChannelInfo,
  saveTokenToDB,
  getTokenFromDB,
  fetchCommands,
  fetchCommandsRole,
  fetchDefaultCommand,
  saveMessageToDB,
  addCommand,
  BotUsername,
  topLevel,
  updateTokenInDB,
  logUserLiveMessage,
  getChannelInfoById,
  getCommandTimerById,
  getJoinedChannels,
  UserJoinChannelToDay,
};
