async function handleTimeStream(chatClient, channelName, username, dataChannel, status) {
  try {
    const uptime = dataChannel.channelUptime; // مدة البث

    let message = "";

    if (status === 1) {
      message = ` ${uptime}`;
    } else {
      message = ` ${uptime}`;
    }

    await chatClient.say(channelName, message);
  } catch (error) {
    console.error("❌ Error getting stream uptime:", error.message);

    const errorMessage =
      status === 1
        ? `@${username}, حدث خطأ أثناء جلب مدة البث 😢`
        : `@${username}, an error occurred while fetching stream uptime 😢`;

    // await chatClient.say(channelName, errorMessage);
  }
}

module.exports = { handleTimeStream };
