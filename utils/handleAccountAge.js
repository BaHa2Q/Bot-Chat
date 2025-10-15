async function handleAccountAge(chatClient, channelName, username, message, apiClient, status) {
  try {
    const mentionedUser = message.split(" ")[1];
    const targetNameRaw = mentionedUser ? mentionedUser.replace("@", "").toLowerCase() : username.toLowerCase();

    const validLoginRegex = /^[a-z0-9_]+$/;
    if (!validLoginRegex.test(targetNameRaw)) {
      const msg = status === 2
        ? `@${username}، استخدم اسم لاتيني صحيح.`
        : `@${username}, use a valid username.`;
      return await chatClient.say(channelName, msg);
    }

    const user = await apiClient.users.getUserByName(targetNameRaw);
    if (!user) {
      const notFoundMsg = status === 2
        ? `@${username}، المستخدم غير موجود.`
        : `@${username}, user not found.`;
      return await chatClient.say(channelName, notFoundMsg);
    }

    const createdDate = new Date(user.creationDate || user.createdAt);
    const now = new Date();

    const diffMs = now - createdDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;

    const displayTarget = mentionedUser || `@${username}`;
    const msg = status === 2
      ? `${displayTarget}  عمر القناة: ${years}سنة ${months}شهر ${days}يوم ( ${diffDays} يوم)`
      : `${displayTarget}  has been on Twitch for year ${years} months ${months} day ${days} - (${diffDays} days)`;

    await chatClient.say(channelName, msg);
  } catch {
    const errMsg = status === 2
      ? `@${username}، حدث خطأ أثناء جلب العمر.`
      : `@${username}, error fetching account age.`;
    // await chatClient.say(channelName, errMsg);
  }
}

module.exports = { handleAccountAge };
