async function handleViewCount(chatClient, channelName, username, dataChannel, status) {
  try {
    const viewerCount = dataChannel.channelViewers;

    let message = "";

    if (status === 1) {
      message = `👁️ عدد المشاهدين الحالي هو: ${viewerCount}`;
    } else {
      message = `👁️ Current viewer count is: ${viewerCount}`;
    }

    await chatClient.say(channelName, message);
  } catch (error) {
    console.error("❌ Error getting viewer count:", error.message);

    const errorMessage =
      status === 1
        ? `@${username}, حدث خطأ أثناء جلب عدد المشاهدين 😢`
        : `@${username}, an error occurred while fetching viewer count 😢`;

    // await chatClient.say(channelName, errorMessage);
  }
}

module.exports = { handleViewCount };
