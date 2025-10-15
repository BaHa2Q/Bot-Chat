const { initTwitchClients } = require('./services/twitch');
const { AppDataSource } = require('./data-source'); // ⚠️ تأكد من وجود هذا المسار
process.on('warning', e => {
  if (e.name === 'DeprecationWarning' && e.code === 'DEP0040') return;
  console.warn(e);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.log('♻️ Restarting in 3s...');
  setTimeout(() => process.exit(1), 3000);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  console.log('♻️ Restarting in 3s...');
  setTimeout(() => process.exit(1), 3000);
});

async function retry(fn, label = 'Unknown', retries = 5, delay = 3000) {
  while (retries > 0) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`⚠️ ${label} failed. Retries left: ${retries - 1}`);
      retries--;
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.error(`❌ ${label} failed after all retries.`);
  return false;
}

async function startWatchingToken() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Oracle DataSource initialized using TypeORM.');
    }
  } catch (err) {
    console.error('❌ Failed to initialize TypeORM DataSource:', err);
    process.exit(1);
  }

  // ✅ أول تهيئة
  const firstInit = await retry(() => initTwitchClients(), 'Initial Twitch client init');
  if (firstInit) {
    console.log('✅ Bot initialized.');
  }

  // ♻️ التكرار المستمر لفحص تغيّر التوكين
  setInterval(async () => {
    const changed = await retry(() => initTwitchClients(), 'Re-check token');
    if (changed) {
      console.log('♻️ Token changed. Refreshed auth only.');
    }
  }, 10 * 60 * 1000);
}

// ✅ أغلق الاتصال عند الخروج من البرنامج
process.on('SIGINT', async () => {
  console.log("\n🛑 Caught interrupt signal");

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('🔌 TypeORM DataSource connection closed.');
  }

  process.exit(0);
});

startWatchingToken();
