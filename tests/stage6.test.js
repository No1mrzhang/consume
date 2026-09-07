/**
 * 阶段6测试：徽章与打卡
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function setupDom() {
  let html = fs.readFileSync(path.join(PROJECT_ROOT, 'www', 'index.html'), 'utf8');
  const coreJs = fs.readFileSync(path.join(PROJECT_ROOT, 'www', 'core.js'), 'utf8');
  html = html.replace('<script src="core.js"></script>', '<script>' + coreJs + '</script>');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/',
    pretendToBeVisual: true
  });
  return dom;
}

describe('阶段6 - App.Badges 核心逻辑', function () {
  let App;

  beforeEach(function () {
    App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));
    App.Storage._setMock(null);
    App.init();
  });

  test('徽章定义有20个', function () {
    assert.strictEqual(App.Badges.DEFINITIONS.length, 20);
  });

  test('徽章覆盖4个分类', function () {
    const cats = new Set(App.Badges.DEFINITIONS.map(b => b.category));
    assert.ok(cats.has('persistence'));
    assert.ok(cats.has('budget'));
    assert.ok(cats.has('category'));
    assert.ok(cats.has('fun'));
  });

  test('getAll返回所有徽章含解锁状态', function () {
    const badges = App.Badges.getAll();
    assert.strictEqual(badges.length, 20);
    badges.forEach(b => {
      assert.ok(b.id);
      assert.ok(b.name);
      assert.ok(b.icon);
      assert.strictEqual(b.unlocked, false);
    });
  });

  test('getUnlockedCount初始为0', function () {
    assert.strictEqual(App.Badges.getUnlockedCount(), 0);
  });

  test('首笔记账解锁first_record', function () {
    App.Records.add(10, 'cat_food');
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'first_record'), '应解锁首笔记账徽章');
    assert.ok(App.Badges.getUnlockedCount() >= 1, '至少解锁1个徽章');
    // 首笔记账同时解锁月度达标、零超支、连续3月达标（前两月无记录自动满足）
    assert.ok(App.Badges.getUnlockedCount() >= 4, '应至少解锁4个徽章');
  });

  test('累计10笔解锁ten_records', function () {
    for (let i = 0; i < 10; i++) App.Records.add(10, 'cat_food');
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'ten_records'));
  });

  test('连续7天解锁streak_7', function () {
    const checkin = App.Checkin.get();
    checkin.continuousDays = 7;
    App.Storage.set('checkin', checkin);
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'streak_7'));
  });

  test('连续30天解锁streak_30', function () {
    const checkin = App.Checkin.get();
    checkin.continuousDays = 30;
    App.Storage.set('checkin', checkin);
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'streak_30'));
  });

  test('使用全部7个分类解锁all_categories', function () {
    const catIds = ['cat_food', 'cat_study', 'cat_life', 'cat_transport', 'cat_entertainment', 'cat_shopping', 'cat_other'];
    catIds.forEach(id => App.Records.add(10, id));
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'all_categories'));
  });

  test('深夜记账解锁night_owl', function () {
    App.Records.add(10, 'cat_food', '', null, new Date(2026, 8, 7, 23, 30).getTime());
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'night_owl'));
  });

  test('凌晨记账解锁early_bird', function () {
    App.Records.add(10, 'cat_food', '', null, new Date(2026, 8, 7, 3, 30).getTime());
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'early_bird'));
  });

  test('宠物满级解锁pet_max', function () {
    const pet = App.Pet.get();
    pet.level = 5;
    App.Storage.set('pet', pet);
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'pet_max'));
  });

  test('冲动消费3笔解锁impulse_3', function () {
    for (let i = 0; i < 3; i++) App.Records.add(100, 'cat_shopping', '', 'impulse');
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'impulse_3'));
  });

  test('单笔500元解锁big_spender', function () {
    App.Records.add(500, 'cat_shopping');
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'big_spender'));
  });

  test('单日5笔解锁five_a_day', function () {
    for (let i = 0; i < 5; i++) App.Records.add(10, 'cat_food');
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'five_a_day'));
  });

  test('已解锁徽章不重复解锁', function () {
    App.Records.add(10, 'cat_food');
    App.Badges.checkAll(); // 首次解锁
    const count1 = App.Badges.getUnlockedCount();
    const newBadges = App.Badges.checkAll(); // 再次检查
    assert.strictEqual(newBadges.length, 0, '不应有新解锁徽章');
    assert.strictEqual(App.Badges.getUnlockedCount(), count1);
  });

  test('月度不超支解锁month_safe', function () {
    App.Records.add(100, 'cat_food'); // 远低于1200
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'month_safe'));
  });

  test('精准达标解锁perfect_budget', function () {
    App.Records.add(1200, 'cat_food'); // 刚好1200
    const newBadges = App.Badges.checkAll();
    assert.ok(newBadges.find(b => b.id === 'perfect_budget'));
  });
});

describe('阶段6 - App.Checkin 核心逻辑', function () {
  let App;

  beforeEach(function () {
    App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));
    App.Storage._setMock(null);
    App.init();
  });

  test('get返回默认打卡数据', function () {
    const checkin = App.Checkin.get();
    assert.strictEqual(checkin.continuousDays, 0);
    assert.strictEqual(checkin.totalDays, 0);
    assert.strictEqual(checkin.lastCheckinDate, null);
  });

  test('首次打卡continuousDays=1', function () {
    const result = App.Checkin.check();
    assert.strictEqual(result.checkedIn, true);
    assert.strictEqual(result.continuousDays, 1);
    const checkin = App.Checkin.get();
    assert.strictEqual(checkin.continuousDays, 1);
    assert.strictEqual(checkin.totalDays, 1);
    assert.ok(checkin.lastCheckinDate);
  });

  test('同一天不重复打卡', function () {
    App.Checkin.check();
    const result = App.Checkin.check();
    assert.strictEqual(result.checkedIn, false);
    assert.strictEqual(result.isNewDay, false);
    const checkin = App.Checkin.get();
    assert.strictEqual(checkin.continuousDays, 1);
    assert.strictEqual(checkin.totalDays, 1);
  });

  test('连续两天打卡continuousDays=2', function () {
    // 模拟昨天已打卡
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const checkin = App.Checkin.get();
    checkin.lastCheckinDate = App.Utils.formatDate(yesterday.getTime());
    checkin.continuousDays = 1;
    checkin.totalDays = 1;
    App.Storage.set('checkin', checkin);

    const result = App.Checkin.check();
    assert.strictEqual(result.checkedIn, true);
    assert.strictEqual(result.continuousDays, 2);
  });

  test('断签后重置为1', function () {
    // 模拟3天前打卡（断签）
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const checkin = App.Checkin.get();
    checkin.lastCheckinDate = App.Utils.formatDate(threeDaysAgo.getTime());
    checkin.continuousDays = 10;
    App.Storage.set('checkin', checkin);

    const result = App.Checkin.check();
    assert.strictEqual(result.continuousDays, 1, '断签后应重置为1');
  });

  test('getStreakInfo 1-6天返回普通火焰', function () {
    const checkin = App.Checkin.get();
    checkin.continuousDays = 3;
    App.Storage.set('checkin', checkin);
    const info = App.Checkin.getStreakInfo();
    assert.strictEqual(info.icon, '🔥');
    assert.strictEqual(info.color, 'normal');
    assert.strictEqual(info.title, '继续加油');
  });

  test('getStreakInfo 7天返回蓝色', function () {
    const checkin = App.Checkin.get();
    checkin.continuousDays = 7;
    App.Storage.set('checkin', checkin);
    const info = App.Checkin.getStreakInfo();
    assert.strictEqual(info.icon, '💎');
    assert.strictEqual(info.color, 'blue');
    assert.strictEqual(info.title, '记账新手');
  });

  test('getStreakInfo 30天返回紫色', function () {
    const checkin = App.Checkin.get();
    checkin.continuousDays = 30;
    App.Storage.set('checkin', checkin);
    const info = App.Checkin.getStreakInfo();
    assert.strictEqual(info.icon, '👑');
    assert.strictEqual(info.color, 'purple');
    assert.strictEqual(info.title, '记账达人');
  });

  test('getStreakInfo 100天返回金色', function () {
    const checkin = App.Checkin.get();
    checkin.continuousDays = 100;
    App.Storage.set('checkin', checkin);
    const info = App.Checkin.getStreakInfo();
    assert.strictEqual(info.icon, '✨');
    assert.strictEqual(info.color, 'gold');
    assert.strictEqual(info.title, '记账之神');
  });

  test('getMonthCalendar返回本月打卡日期', function () {
    App.Checkin.check(); // 今天打卡
    const dates = App.Checkin.getMonthCalendar();
    assert.ok(Array.isArray(dates));
    assert.ok(dates.length >= 1);
    assert.ok(dates[0].startsWith(App.Utils.thisMonth()));
  });
});

describe('阶段6 - 徽章墙UI', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.PetUI.init();
    window.PetUI.render();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('徽章墙渲染20个徽章', function () {
    const badges = document.querySelectorAll('.badge-item');
    assert.strictEqual(badges.length, 20);
  });

  test('未解锁徽章显示灰色样式', function () {
    const locked = document.querySelectorAll('.badge-item.locked');
    assert.strictEqual(locked.length, 20, '初始全部未解锁');
  });

  test('徽章计数显示0/20', function () {
    const count = document.getElementById('badgeCountText').textContent;
    assert.ok(count.includes('0 / 20'));
  });

  test('点击徽章显示详情弹窗', function () {
    const badge = document.querySelector('.badge-item');
    badge.click();
    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'), '应弹出详情弹窗');
  });

  test('徽章分类筛选', function () {
    const tabs = document.querySelectorAll('.badge-category-tab');
    assert.strictEqual(tabs.length, 5, '应有5个分类标签（全部+4类）');
    // 点击"记账坚持"
    tabs[1].click();
    const badges = document.querySelectorAll('.badge-item');
    assert.ok(badges.length < 20, '筛选后应少于20个');
    assert.ok(badges.length >= 6, '记账坚持类至少6个');
  });

  test('记账后徽章解锁并显示彩色', function () {
    // 记一笔账
    window.AppUI.switchPage('page-chat');
    window.ChatUI.init();
    const input = document.getElementById('chatInput');
    input.value = '吃饭 25 元';
    document.getElementById('chatSendBtn').click();
    // 切换回宠物页
    window.AppUI.switchPage('page-pet');
    window.PetUI.render();
    const unlocked = document.querySelectorAll('.badge-item:not(.locked)');
    assert.ok(unlocked.length >= 1, '应至少解锁1个徽章');
    const count = document.getElementById('badgeCountText').textContent;
    assert.ok(!count.includes('0 / 20'), '计数不应为0/20，实际：' + count);
    assert.ok(count.includes('/ 20'), '计数格式应为x/20');
  });
});

describe('阶段6 - 打卡UI', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.PetUI.init();
    window.PetUI.render();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('打卡火焰显示', function () {
    assert.ok(document.getElementById('checkinFire').textContent);
  });

  test('初始打卡天数为0', function () {
    assert.strictEqual(document.getElementById('checkinDays').textContent, '0');
  });

  test('打卡称号显示', function () {
    const badge = document.getElementById('checkinBadge');
    assert.ok(badge.textContent.length > 0);
  });

  test('打卡日历渲染表头和日期', function () {
    const grid = document.getElementById('checkinCalendar');
    const children = grid.children;
    assert.ok(children.length >= 7, '至少有7个表头');
    // 前7个是表头
    for (let i = 0; i < 7; i++) {
      assert.ok(children[i].classList.contains('calendar-day-header'));
    }
  });

  test('记账后打卡天数增加', function () {
    window.AppUI.switchPage('page-chat');
    window.ChatUI.init();
    const input = document.getElementById('chatInput');
    input.value = '吃饭 25 元';
    document.getElementById('chatSendBtn').click();
    window.AppUI.switchPage('page-pet');
    window.PetUI.render();
    assert.strictEqual(document.getElementById('checkinDays').textContent, '1');
  });

  test('今天打卡后日历标记', function () {
    window.App.Checkin.check();
    window.CheckinUI.render();
    const checked = document.querySelectorAll('.calendar-day.checked');
    assert.ok(checked.length >= 1, '今天应标记为已打卡');
  });
});
