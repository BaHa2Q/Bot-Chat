const { ApiClient } = require('@twurple/api');
const { RefreshingAuthProvider } = require('@twurple/auth');
const {
  getJoinedChannels,
  UserJoinChannelToDay,
} = require('./database');

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
const IGNORED_BOTS = new Set(['wizebot', 'nightbot', 'streamelements', 'moobot', 'yallabots']);

async function logEvent(channel_id, channelName, user) {
  await UserJoinChannelToDay(channel_id, channelName, user);
}

async function checkViewers() {
  try {
    const result = await getJoinedChannels();
    const allChannelsInfo = result.channelHasJoin || [];

    for (const { channel_id, access_token, refresh_token, expiresIn } of allChannelsInfo) {
      if (!access_token || !refresh_token || !channel_id) {
        console.warn(`⚠️ Skipping channel with missing data.`);
        continue;
      }

      const authProvider = new RefreshingAuthProvider({ clientId, clientSecret }, {});
      authProvider.onRefresh(async (userId, newToken) => {
        console.log(`🔄 Token refreshed for ${userId}`);
      });

      try {
        await authProvider.addUserForToken(
          {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: Number(expiresIn),
            obtainmentTimestamp: Date.now()
          },
          channel_id
        );
      } catch (tokenErr) {
        console.error(`❌ Invalid or expired token for ${channel_id}, skipping.`, tokenErr.message);
        continue;
      }

      const apiClient = new ApiClient({ authProvider });

      try {
        const broadcaster = await apiClient.users.getUserById(channel_id);
        if (!broadcaster) {
          console.error(`❌ No broadcaster found for ID ${channel_id}`);
          continue;
        }

        const channelName = broadcaster.name;
        const broadcasterId = broadcaster.id;

        try {
          const chattersResponse = await apiClient.chat.getChatters(channel_id, broadcasterId);
          const chatters = chattersResponse.data;
          const newViewers = new Set(chatters.map(c => c.username.toLowerCase()));

          for (const user of newViewers) {
            if (!IGNORED_BOTS.has(user)) {
              const userInfo = await apiClient.users.getUserByName(user);
              if (userInfo) {
                await logEvent(channel_id, channelName, user);
              }
            }
          }
        } catch (chatError) {
          if (
            chatError?.message?.includes('does not have any of the requested scopes') &&
            chatError?.message?.includes('moderator:read:chatters')
          ) {
            // console.warn(`⚠️ Missing scope for chatters in channel ${channel_id}`);
          } else {
            console.error(`❌ Failed to fetch chatters for ${channel_id}:`, chatError);
          }
        }

      } catch (err) {
        console.error(`❌ Unexpected error for channel ${channel_id}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Fatal error in checkViewers:', err);
  }
}

module.exports = { checkViewers };
