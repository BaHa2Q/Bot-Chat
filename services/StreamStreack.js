const { updateUserStreak, updateAllTodayStreaks } = require("./updateUserStreak");

async function StreamStreack(apiClient, userId, channelId) {
  const userInfo = await apiClient.users.getUserById(userId);
  const channelInfo = await apiClient.users.getUserById(channelId); // ✅ اسم القناة الموثوق
  const stream = await apiClient.streams.getStreamByUserId(channelId);

  if (!stream) return;

  const streamStart = stream.startDate;

  // ✅ تحديث الكل
  await updateAllTodayStreaks(stream.userId);

  // ✅ تحديث هذا المستخدم
  await updateUserStreak({
    channelId: stream.userId,
    channelName: channelInfo.displayName, // ✅ مصدر موثوق لاسم القناة
    userId: userInfo.id,
    username: userInfo.displayName,
    streamStart,
  });
}

module.exports = { StreamStreack };
