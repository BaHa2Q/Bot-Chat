const Fuse = require("fuse.js");
const { insertLog } = require("./database");

async function changeGame(game,channel,channelId,username,chatClient,userId,isBot,apiClient,status) {
  let popularGames = [];
  let fuse = null;

  try {
    const result = await apiClient.games.getTopGames();
    popularGames = result.data.map((game) => ({id: game.id,name: game.name,}));

    fuse = new Fuse(popularGames, {keys: ["name"],threshold: 0.4});
  } catch (err) {
    return;
  }

  if (!fuse) return;

  const results = fuse.search(game);

  if (results.length === 0) return;

  const bestMatch = results[0].item;

  let currentGameId = null;
  try {
    const currentInfo = await apiClient.channels.getChannelInfoById(channelId);
    currentGameId = currentInfo?.gameId;
  } catch (e) {
    console.warn("Failed to get current game info", e);
  }

  if (currentGameId && bestMatch.id === currentGameId) {
    const msg = status === 2 ? ` اللعبة "${bestMatch.name}" هي بالفعل اللعبة الحالية.` : ` The game "${bestMatch.name}" is already set.`;
    chatClient.say(channel, msg);
    return;
  }

  try {
    await apiClient.channels.updateChannelInfo(channelId, {
      gameId: bestMatch.id,
    });

    const msg =status === 2? `✅ تم تغيير التصنيف إلى "${bestMatch.name}"`: `✅ Game category changed to "${bestMatch.name}"`;
    chatClient.say(channel, msg);

    await insertLog(channelId,username,`Game changed to: ${bestMatch.name}`,  8,userId,isBot);
  } catch (error) {
    // const msg = status === 2 ? "❌ حدث خطأ أثناء محاولة تغيير التصنيف." : "❌ An error occurred while trying to change the game category.";
    //   chatClient.say(channel, msg);

    await insertLog(channelId,username,`Failed to change game: ${game}`,7,userId,isBot);
  }
}

module.exports = { changeGame };
