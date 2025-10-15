const { ApiClient } = require("@twurple/api");
const { getJoinedChannels } = require("./database");
const { StaticAuthProvider } = require("@twurple/auth");

const viewersPerChannel = new Map();
const previousStatusMap = new Map();

async function updateChannels(chatClient, joinedChannelsMap, allChannels) {
    try {
        const activeChannels = allChannels.filter(c => c.isjoin === 1).map(c => c.channel.toLowerCase());
        const currentlyJoined = [...joinedChannelsMap.keys()];
        const newToJoin = activeChannels.filter(c => !joinedChannelsMap.has(c));
        const toLeave = currentlyJoined.filter(c => !activeChannels.includes(c));


        // 🔁 إعادة جلب القنوات مع التوكينات الجديدة
const updatedChannels = (await getJoinedChannels()).channelHasJoin;
        
        for (const channel of newToJoin) {
            try {
                await chatClient.join(channel);
                const channelData = updatedChannels.find(c => c.channel.toLowerCase() === channel);
                if (channelData) {
                    joinedChannelsMap.set(channel, {
                        access_token: channelData.access_token,
                        channel_id: channelData.channel_id,
                        channel: channelData.channel
                    });
                }
            } catch (err) {
                console.error(`❌ Failed to join: ${channel}`, err);
            }
        }

        for (const channel of toLeave) {
            try {
                await chatClient.part(channel);
                joinedChannelsMap.delete(channel);
                viewersPerChannel.delete(channel);
            } catch (err) {
                console.error(`⚠️ Failed to leave: ${channel}`, err);
            }
        }

        let hasChanges = false;
        const currentStatus = [];

        for (let i = 0; i < updatedChannels.length; i++) {
            const c = updatedChannels[i];
            const name = c.channel.toLowerCase();
            let status = '❌ Not Joined';

            if (joinedChannelsMap.has(name) && c.isjoin === 1) {
                try {
                    const authProvider = new StaticAuthProvider(process.env.TWITCH_CLIENT_ID, c.access_token);
                    const apiClient = new ApiClient({ authProvider });

                    const user = await apiClient.users.getUserById(c.channel_id);
                    if (user) {
                        status = '✅ Joined & Token OK';
                    } else {
                        status = '❌ Token Invalid';
                    }
                } catch (err) {
                    status = '❌ Token Invalid';
                }
            }

            const previous = previousStatusMap.get(name);
            if (!previous || previous.isjoin !== c.isjoin || previous.status !== status) {
                hasChanges = true;
            }

            currentStatus.push({ '#': i + 1, Channel: name, isjoin: c.isjoin, Status: status });
            previousStatusMap.set(name, { isjoin: c.isjoin, status: status });
        }

        if (hasChanges) {
            console.log('📺 Channel Status Changed:');
            console.table(currentStatus);
        }

    } catch (err) {
        console.error('❌ Failed to update channels:', err);
    }
}

module.exports = { updateChannels };
