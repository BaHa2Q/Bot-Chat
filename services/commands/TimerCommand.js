const { insertLog } = require('../database');

async function TimerCommand(channel,channelId,message,username,userId,client,activeTimers,response3,response2,isBot) {
  

  
    const timerData = activeTimers.get(channelId);
  
    // Check if there is an active timer
    if (timerData && timerData.active) {
      // If an active timer is found, notify the user only if no notification has been sent
      if (!timerData.notificationSent) {
        client.say(channel, response3);
        timerData.notificationSent = true; // Mark the notification as sent
        await insertLog(
         
          
          username,
          `Notification about active timer sent: ${message}`,
          7,
          userId,
          isBot
        );
      } else {
        await insertLog(
          channelId,
          username,
          `Attempted to start a new timer while another was active: ${message}`,
          7,
          userId,
          isBot
        );
      }
      return;
    }
  
    // Parse the message to extract the duration and optional username
    const args = message.split(" ");
    let targetUser = username; // Default to the command issuer
  
    if (args.length === 3) {
      // If username is specified
      targetUser = args[2].startsWith('@') ? args[2].substring(1) : args[2]; // Remove '@' if present
    } else if (args.length !== 2) {
      client.say(channel, `(#timer 1h or 30m or 10s) @${username}`);
      await insertLog(
        channelId,
        username,
        `Invalid timer format: ${message}`,
        7,
        userId,
        isBot
      );
      return;
    }
  
    const duration = args[1];
    let timeValue = parseInt(duration.slice(0, -1), 10);
    let timeUnit = duration.slice(-1);
    await insertLog( channelId, username, `${args}`, 8, userId,isBot);
    if (
      isNaN(timeValue) ||
      timeValue <= 0 ||
      !["s", "m", "h"].includes(timeUnit)
    ) {
      client.say(channel, response2);
      await insertLog(
        channelId,
        username,
        `Invalid timer unit: ${message}`,
        7,
        userId,
        isBot
      );
      return;
    }
  
    // Calculate the timeout in milliseconds
    let timeoutMs;
    switch (timeUnit) {
      case "s":
        timeoutMs = timeValue * 1000;
        break;
      case "m":
        timeoutMs = timeValue * 60 * 1000;
        break;
      case "h":
        timeoutMs = timeValue * 60 * 60 * 1000;
        break;
      default:
        timeoutMs = 0;
        break;
    }
  
    // Set the timer as active and reset notification status
    activeTimers.set(channelId, {
      active: true,
      notificationSent: false,
    });
  
    client.say(
      channel,
      `🕒 بدأ العد التنازلي، @${targetUser}! لديك ${duration} للانتهاء من التحدي!`
    );
    await insertLog(
      
      channelId,
      username,
      `Timer started: ${duration} for @${targetUser}`,
      8,
      userId,
      isBot
    );
  
    // Handle timer expiration
    setTimeout(() => {
      client.say(
        channel,
        `⏳ انتهى الوقت، @${targetUser}! ${duration}`
      );
      insertLog(
        
        channelId,
        username,
        `Timer ended: ${duration} for @${targetUser}`,
        8,
        userId,
        isBot
      );
      activeTimers.delete(channelId); // Remove the timer from active timers
    }, timeoutMs);
  }
  
  module.exports = { TimerCommand };
  