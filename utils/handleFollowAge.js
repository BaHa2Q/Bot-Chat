async function handleFollowAge(chatClient, channelName, username, userId, apiClient, status) {
  try {
    const broadcasterUser = await apiClient.users.getUserByName(channelName);
    if (!broadcasterUser) {
      const msg = status === 2
        ? `@${username}، لم يتم العثور على القناة.`
        : `@${username}, broadcaster not found.`;
      return await chatClient.say(channelName, msg);
    }

    const follow = await apiClient.channels.getFollowFromUserToBroadcaster(userId, broadcasterUser.id);

    if (!follow) {
      const msg = status === 2
        ? `@${username}، لم تقم بمتابعة القناة بعد.`
        : `@${username}, you are not following this channel.`;
      return await chatClient.say(channelName, msg);
    }

    const followedAt = new Date(follow.followDate);
    const now = new Date();
    const diffMs = now - followedAt;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;

    const msg = status === 2
      ? `@${username} متابع القناة منذ ${years} سنة و ${months} شهر و ${days} يوم.`
      : `@${username} has been following for ${years} year(s), ${months} month(s), ${days} day(s).`;

    await chatClient.say(channelName, msg);

  } catch (error) {
    console.error("❌ Error getting follow age:", error.message);
    const errMsg = status === 2
      ? `@${username}، حدث خطأ أثناء جلب مدة المتابعة.`
      : `@${username}, error fetching follow age.`;
    // await chatClient.say(channelName, errMsg);
  }
}

module.exports = { handleFollowAge };
