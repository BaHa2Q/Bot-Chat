async function handleFollowCount(chatClient, channelName, username, dataChannel, status) {
  try {
    let message = "";
    
    if (status === 1) {
      message = `📊 عدد المتابعين الحالي هو: ${dataChannel.channelFollowers}`;
    } else {
      message = `📊 Current follower count is: ${dataChannel.channelFollowers}`;
    }

    await chatClient.say(channelName, message);
  } catch (error) {
    console.error("❌ Error getting follower count:", error.message);

    const errorMessage =
      status === 1
        ? `@${username}, حدث خطأ أثناء جلب عدد المتابعين 😢`
        : `@${username}, an error occurred while fetching follower count 😢`;

    // await chatClient.say(channelName, errorMessage);
  }
}

module.exports = { handleFollowCount };
