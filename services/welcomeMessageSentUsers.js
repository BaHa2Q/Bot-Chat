const { ApiClient } = require('@twurple/api');
const { AppTokenAuthProvider } = require('@twurple/auth');
const { fetchSettingIsLive, isBotUsername, fetchSetting, insertJoinLive } = require('./database');
require('dotenv').config();require('dotenv').config({ debug: false });
// إعداد عميل Twurple (بدّل هذه القيم بما يناسبك)
const clientId =  process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

// إنشاء مزود المصادقة
const authProvider = new AppTokenAuthProvider(clientId, clientSecret);
const welcomeMessageMap = new Map();

// إنشاء عميل API
const apiClient = new ApiClient({ authProvider });

async function isChannelLive(channelName) {
    try {
        const stream = await apiClient.streams.getStreamByUserName(channelName);
        return stream !== null; // إذا يوجد stream => البث مباشر
    } catch (error) {
        console.error('Error checking live status:', error);
        return false;
    }
}

// في دالتك
async function sendWelcomeMessage(connection, client, channel, username, channelId, channelName, userId) {
    if (await fetchSettingIsLive(channelId)) return;

    const isBot = await isBotUsername(username, channelId);
    if (isBot) return;

    // استخدم دالة twurple لفحص البث بدل isChannelLive القديمة
    const liveStatus = await isChannelLive(channelName);
    if (!liveStatus) return;
    
    if (!welcomeMessageMap.has(channelName)) {
        welcomeMessageMap.set(channelName, new Set());
    }

    const userWelcomeSent = welcomeMessageMap.get(channelName);

    if (!userWelcomeSent.has(username)) {
        const active = await fetchSetting(channelId, 6);
        if (!active) {
            console.log(`Sending welcome message to ${username} in ${channelName}`);
            client.say(channel, `Welcome ${username}! Enjoy today's stream!`);

            await insertJoinLive(connection, channelId, userId, username);
            userWelcomeSent.add(username);
        }
    }
}

module.exports = { sendWelcomeMessage };
