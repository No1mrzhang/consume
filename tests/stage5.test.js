/**
 * 阶段5测试：宠物养成系统
 * 测试App.Pet逻辑和宠物页UI
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

describe('阶段5 - App.Pet 核心逻辑', function () {
  let App;

  beforeEach(function () {
    App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));
    App.Storage._setMock(null);
    App.init();
  });

  test('等级配置有5级', function () {
    assert.strictEqual(App.Pet.LEVELS.length, 5);
    assert.strictEqual(App.Pet.LEVELS[0].name, '猫蛋');
    assert.strictEqual(App.Pet.LEVELS[4].name, '猫王');
    assert.strictEqual(App.Pet.LEVELS[4].expNeeded, Infinity);
  });

  test('get返回默认宠物', function () {
    const pet = App.Pet.get();
    assert.strictEqual(pet.name, '小橘');
    assert.strictEqual(pet.level, 1);
    assert.strictEqual(pet.exp, 0);
  });

  test('getLevelInfo返回正确等级信息', function () {
    assert.strictEqual(App.Pet.getLevelInfo(1).icon, '🥚');
    assert.strictEqual(App.Pet.getLevelInfo(2).name, '小奶猫');
    assert.strictEqual(App.Pet.getLevelInfo(5).expNeeded, Infinity);
  });

  test('getExpProgress返回正确进度', function () {
    const progress = App.Pet.getExpProgress();
    assert.strictEqual(progress.current, 0);
    assert.strictEqual(progress.needed, 50);
    assert.strictEqual(progress.percent, 0);
    assert.strictEqual(progress.isMax, false);
  });

  test('calcExpGain计算正确', function () {
    assert.strictEqual(App.Pet.calcExpGain(25), 12); // 10 + floor(25/10)=12
    assert.strictEqual(App.Pet.calcExpGain(100), 20); // 10 + 10
    assert.strictEqual(App.Pet.calcExpGain(5), 10); // 10 + 0
    assert.strictEqual(App.Pet.calcExpGain(0), 10);
  });

  test('addExp增加经验不升级', function () {
    const result = App.Pet.addExp(25); // 获得12经验
    assert.strictEqual(result.leveledUp, false);
    assert.strictEqual(result.oldLevel, 1);
    assert.strictEqual(result.newLevel, 1);
    assert.strictEqual(result.gainedExp, 12);
    const pet = App.Pet.get();
    assert.strictEqual(pet.exp, 12);
    assert.strictEqual(pet.totalExp, 12);
  });

  test('addExp达到阈值时升级', function () {
    // 先加40经验（10+30=40，金额300）
    App.Pet.addExp(300); // 10+30=40
    // 再加10经验（金额0），总共50，达到升级阈值
    const result = App.Pet.addExp(0); // 10经验
    assert.strictEqual(result.leveledUp, true);
    assert.strictEqual(result.oldLevel, 1);
    assert.strictEqual(result.newLevel, 2);
    assert.strictEqual(result.newName, '小奶猫');
    assert.strictEqual(result.newIcon, '🐱');
    const pet = App.Pet.get();
    assert.strictEqual(pet.level, 2);
    assert.strictEqual(pet.exp, 0); // 50-50=0
  });

  test('addExp经验足够多时连续升级', function () {
    // 加大量经验（金额5000 → 10+500=510经验）
    // 1级需50，2级需150，3级需300，总共500，510可升到4级剩10
    const result = App.Pet.addExp(5000);
    assert.strictEqual(result.leveledUp, true);
    assert.strictEqual(result.newLevel, 4);
    const pet = App.Pet.get();
    assert.strictEqual(pet.level, 4);
    assert.strictEqual(pet.exp, 10); // 510 - 50 - 150 - 300 = 10
  });

  test('满级后经验不再增加', function () {
    // 直接设置为满级
    const pet = App.Pet.get();
    pet.level = 5;
    pet.exp = 0;
    App.Storage.set('pet', pet);
    const result = App.Pet.addExp(100);
    assert.strictEqual(result.leveledUp, false);
    assert.strictEqual(result.newLevel, 5);
    const petAfter = App.Pet.get();
    assert.strictEqual(petAfter.exp, 0, '满级后经验应为0');
    const progress = App.Pet.getExpProgress();
    assert.strictEqual(progress.isMax, true);
    assert.strictEqual(progress.needed, 0);
  });

  test('getMood根据预算比例返回正确心情', function () {
    // 无记录，ratio=0 < 0.5 → 开心
    assert.strictEqual(App.Pet.getMood().name, '开心');
    // 50% → 一般
    App.Records.add(600, 'cat_food');
    assert.strictEqual(App.Pet.getMood().name, '一般');
    // 80% → 紧张
    App.Records.add(360, 'cat_food');
    assert.strictEqual(App.Pet.getMood().name, '紧张');
    // 90% → 焦虑
    App.Records.add(120, 'cat_food');
    assert.strictEqual(App.Pet.getMood().name, '焦虑');
    // 超支 → 难过
    App.Records.add(200, 'cat_food');
    assert.strictEqual(App.Pet.getMood().name, '难过');
  });

  test('setName改名', function () {
    assert.strictEqual(App.Pet.setName('咪咪'), true);
    assert.strictEqual(App.Pet.get().name, '咪咪');
    assert.strictEqual(App.Pet.setName(''), false, '空名字应返回false');
    assert.strictEqual(App.Pet.setName('  '), false, '空白名字应返回false');
  });

  test('reset重置宠物', function () {
    const pet = App.Pet.get();
    pet.level = 3;
    pet.exp = 100;
    pet.totalExp = 500;
    App.Storage.set('pet', pet);
    App.Pet.reset();
    const reset = App.Pet.get();
    assert.strictEqual(reset.level, 1);
    assert.strictEqual(reset.exp, 0);
    assert.strictEqual(reset.totalExp, 0);
  });

  test('interact返回随机台词并更新lastInteract', function () {
    const before = App.Pet.get().lastInteract;
    const line = App.Pet.interact();
    assert.ok(line && line.length > 0, '应返回台词');
    const after = App.Pet.get().lastInteract;
    assert.ok(after >= before, 'lastInteract应更新');
  });
});

describe('阶段5 - 宠物页UI渲染', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.ChatUI.init();
    window.PetUI.init();
    window.PetUI.render();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('宠物页显示默认形象和名字', function () {
    assert.strictEqual(document.getElementById('petAvatarLarge').textContent, '🥚');
    assert.strictEqual(document.getElementById('petNameDisplay').textContent, '小橘');
  });

  test('宠物页显示等级徽章', function () {
    const badge = document.getElementById('petLevelBadge').textContent;
    assert.ok(badge.includes('Lv.1'));
    assert.ok(badge.includes('猫蛋'));
  });

  test('宠物页显示心情', function () {
    const mood = document.getElementById('petMoodDisplay').textContent;
    assert.ok(mood.includes('😺') || mood.includes('开心'), '应显示开心心情');
  });

  test('宠物页显示经验进度', function () {
    assert.strictEqual(document.getElementById('petExpText').textContent, '0 / 50');
    assert.strictEqual(document.getElementById('petExpFill').style.width, '0%');
  });

  test('点击宠物触发互动气泡', function () {
    const avatar = document.getElementById('petAvatarLarge');
    avatar.click();
    const bubble = document.getElementById('petSpeechBubble');
    assert.ok(bubble.classList.contains('show'), '互动气泡应显示');
    assert.ok(bubble.textContent.length > 0, '气泡应有台词');
  });

  test('记账后宠物经验增加', function () {
    // 切换到记账页记账
    window.AppUI.switchPage('page-chat');
    const input = document.getElementById('chatInput');
    input.value = '吃饭 25 元';
    document.getElementById('chatSendBtn').click();
    // 切换回宠物页
    window.AppUI.switchPage('page-pet');
    window.PetUI.render();
    const expText = document.getElementById('petExpText').textContent;
    assert.ok(expText.includes('12'), '经验应增加12，实际：' + expText);
  });

  test('宠物升级后形象和等级更新', function () {
    // 直接设置经验接近升级
    const pet = window.App.Pet.get();
    pet.exp = 45;
    window.App.Storage.set('pet', pet);
    window.PetUI.render();
    // 记一笔账获得12经验（45+12=57，升级后剩7）
    window.AppUI.switchPage('page-chat');
    const input = document.getElementById('chatInput');
    input.value = '吃饭 25 元';
    document.getElementById('chatSendBtn').click();
    window.AppUI.switchPage('page-pet');
    window.PetUI.render();
    assert.strictEqual(document.getElementById('petAvatarLarge').textContent, '🐱', '升级后应为小奶猫');
    assert.ok(document.getElementById('petLevelBadge').textContent.includes('Lv.2'));
  });

  test('改名后宠物页更新', function () {
    window.App.Pet.setName('咪咪');
    window.PetUI.render();
    assert.strictEqual(document.getElementById('petNameDisplay').textContent, '咪咪');
  });

  test('重置后宠物恢复1级', function () {
    const pet = window.App.Pet.get();
    pet.level = 3;
    pet.exp = 100;
    window.App.Storage.set('pet', pet);
    window.App.Pet.reset();
    window.PetUI.render();
    assert.strictEqual(document.getElementById('petAvatarLarge').textContent, '🥚');
    assert.ok(document.getElementById('petLevelBadge').textContent.includes('Lv.1'));
  });

  test('预算超支时宠物心情变难过', function () {
    for (let i = 0; i < 13; i++) {
      window.App.Records.add(100, 'cat_shopping'); // 1300元，超支
    }
    window.PetUI.render();
    const mood = document.getElementById('petMoodDisplay').textContent;
    assert.ok(mood.includes('😿') || mood.includes('难过'), '超支时应显示难过，实际：' + mood);
  });
});

describe('阶段5 - 记账后宠物升级通知', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.ChatUI.init();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('记账升级后显示升级消息和弹窗', function () {
    // 设置经验接近升级
    const pet = window.App.Pet.get();
    pet.exp = 45;
    window.App.Storage.set('pet', pet);
    // 记账
    const input = document.getElementById('chatInput');
    input.value = '吃饭 100 元'; // 获得20经验，45+20=65，升级后剩15
    document.getElementById('chatSendBtn').click();
    // 检查消息
    const msgs = document.querySelectorAll('.chat-msg');
    const lastMsg = msgs[msgs.length - 1].textContent;
    assert.ok(lastMsg.includes('升级') || lastMsg.includes('进化'), '应显示升级消息，实际：' + lastMsg);
    // 检查弹窗
    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'), '应弹出升级弹窗');
    const title = document.getElementById('modalTitle').textContent;
    assert.ok(title.includes('升级'), '弹窗标题应包含升级');
  });

  test('不升级时不显示升级消息', function () {
    const input = document.getElementById('chatInput');
    input.value = '吃饭 5 元'; // 获得10经验，不升级
    document.getElementById('chatSendBtn').click();
    const msgs = document.querySelectorAll('.chat-msg');
    // 最后一条应该是确认消息，不是升级消息
    const lastMsg = msgs[msgs.length - 1].textContent;
    assert.ok(!lastMsg.includes('升级'), '不升级时不应显示升级消息');
  });
});
