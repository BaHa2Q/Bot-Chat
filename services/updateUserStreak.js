const { AppDataSource } = require("../data-source");
const { UserStreaks } = require("../entities/UserStreaksModel");

// التحقق من كون التاريخين في نفس اليوم
function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

async function updateUserStreak({ channelId, channelName, userId, username, streamStart }) {
  const repo = AppDataSource.getRepository(UserStreaks);

  try {
    const now = new Date(streamStart);

    const existing = await repo.findOne({
      where: {
        channelId: channelId,
        userId: userId,platformId:1
      }
    });

    if (!existing) {
      // المستخدم لا يوجد له سجل سابق - إنشاء سجل جديد
      const newStreak = repo.create({
        channelId,
        channelName,
        userId,
        username,
        streakCount: 1,
        lastDate: now,
        prevStreak: 0,platformId:1
      });

      await repo.save(newStreak);
      return;
    }

    const lastStreamDate = new Date(existing.lastDate);
    const diffDays = (now - lastStreamDate) / (1000 * 60 * 60 * 24);

    if (diffDays > 1) {
      // السلسلة انقطعت - إعادة التهيئة
      existing.prevStreak = existing.streakCount;
      existing.streakCount = 1;
      existing.lastDate = now;
      await repo.save(existing);
    } else if (!isSameDay(now, lastStreamDate)) {
      // المستخدم لم يتم احتساب حضوره اليوم - زيادة السلسلة
      existing.streakCount += 1;
      existing.lastDate = now;
      await repo.save(existing);
    }

    // إذا كان نفس اليوم، لا حاجة لتحديث السلسلة
  } catch (err) {
    console.error("❌ Error in updateUserStreak:", err);
  }
}

async function updateAllTodayStreaks(channelId, streamStart = new Date()) {
  const repo = AppDataSource.getRepository(UserStreaks);

  try {
    const now = new Date(streamStart);

    const all = await repo.find({
      where: {
        channelId: channelId,platformId:1
      }
    });

    for (const record of all) {
      const lastDate = new Date(record.lastDate);

      if (!isSameDay(now, lastDate)) {
        // المستخدم لم يحضر اليوم - إعادة تعيين السلسلة
        record.prevStreak = record.streakCount;
        record.streakCount = 0;
        await repo.save(record);
      }
    }
  } catch (err) {
    console.error("❌ Error in updateAllTodayStreaks:", err);
  }
}

module.exports = { updateUserStreak, updateAllTodayStreaks };
