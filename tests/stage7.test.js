/**
 * 阶段7测试：省钱挑战与存钱罐
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

describe('阶段7 - App.Challenges 核心逻辑', function () {
  let App;

  beforeEach(function () {
    App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));
    App.Storage._setMock(null);
    App.init();
  });

  test('有4个预设挑战', function () {
    assert.strictEqual(App.Challenges.DEFINITIONS.length, 4);
  });

  test('挑战包含不喝奶茶、低碳出行、不购物、餐饮预算', function () {
    const ids = App.Challenges.DEFINITIONS.map(c => c.id);
    assert.ok(ids.includes('no_milk_tea'));
    assert.ok(ids.includes('low_carbon'));
    assert.ok(ids.includes('no_shopping'));
    assert.ok(ids.includes('food_budget'));
  });

  test('getAll返回所有挑战含状态', function () {
    const challenges = App.Challenges.getAll();
    assert.strictEqual(challenges.length, 4);
    challenges.forEach(c => {
      assert.ok(c.name);
      assert.ok(c.icon);
      assert.strictEqual(c.status, 'not_joined');
    });
  });

  test('join加入挑战', function () {
    const result = App.Challenges.join('no_milk_tea');
    assert.ok(result);
    assert.strictEqual(result.status, 'active');
    assert.ok(result.startDate);
    const all = App.Challenges.getAll();
    const ch = all.find(c => c.id === 'no_milk_tea');
    assert.strictEqual(ch.status, 'active');
  });

  test('join重复加入不重复创建', function () {
    App.Challenges.join('no_milk_tea');
    App.Challenges.join('no_milk_tea');
    const stored = App.Storage.get('challenges');
    assert.strictEqual(stored.length, 1, '不应重复创建');
  });

  test('getProgress返回进度信息', function () {
    App.Challenges.join('no_milk_tea');
    const progress = App.Challenges.getProgress('no_milk_tea');
    assert.ok(progress.daysPassed >= 1);
    assert.ok(progress.percent >= 0);
    assert.ok(progress.detail);
  });

  test('checkAll检测no_category挑战失败', function () {
    App.Challenges.join('low_carbon');
    // 记一笔交通消费，违反低碳出行
    App.Records.add(10, 'cat_transport');
    const changed = App.Challenges.checkAll();
    assert.ok(changed.find(c => c.id === 'low_carbon' && c.status === 'failed'), '低碳出行应失败');
  });

  test('checkAll检测no_keyword挑战失败', function () {
    App.Challenges.join('no_milk_tea');
    // 记一笔奶茶
    App.Records.add(15, 'cat_food', '', null, null, '奶茶');
    const changed = App.Challenges.checkAll();
    assert.ok(changed.find(c => c.id === 'no_milk_tea' && c.status === 'failed'), '不喝奶茶应失败');
  });

  test('checkAll检测category_budget挑战失败', function () {
    App.Challenges.join('food_budget');
    // 餐饮超过600
    App.Records.add(700, 'cat_food');
    const changed = App.Challenges.checkAll();
    assert.ok(changed.find(c => c.id === 'food_budget' && c.status === 'failed'), '餐饮预算应失败');
  });

  test('checkAll检测挑战完成', function () {
    // 模拟挑战已开始30天前
    const stored = App.Storage.get('challenges') || [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    stored.push({
      id: 'no_milk_tea',
      status: 'active',
      startDate: App.Utils.formatDate(thirtyDaysAgo.getTime()),
      endDate: null
    });
    App.Storage.set('challenges', stored);
    // 没有奶茶记录，应完成
    const changed = App.Challenges.checkAll();
    assert.ok(changed.find(c => c.id === 'no_milk_tea' && c.status === 'completed'), '挑战应完成');
  });

  test('已完成的挑战不重复检查', function () {
    const stored = [{ id: 'no_milk_tea', status: 'completed', startDate: '2026-01-01', endDate: '2026-01-31' }];
    App.Storage.set('challenges', stored);
    const changed = App.Challenges.checkAll();
    assert.strictEqual(changed.length, 0, '已完成的挑战不应再次变化');
  });

  test('未加入的挑战不检查', function () {
    const changed = App.Challenges.checkAll();
    assert.strictEqual(changed.length, 0);
  });
});

describe('阶段7 - App.PiggyBank 核心逻辑', function () {
  let App;

  beforeEach(function () {
    App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));
    App.Storage._setMock(null);
    App.init();
  });

  test('get返回默认数据', function () {
    const piggy = App.PiggyBank.get();
    assert.strictEqual(piggy.targetAmount, 0);
    assert.strictEqual(piggy.currentAmount, 0);
    assert.deepStrictEqual(piggy.history, []);
  });

  test('setTarget设置目标', function () {
    assert.strictEqual(App.PiggyBank.setTarget(1000), true);
    assert.strictEqual(App.PiggyBank.get().targetAmount, 1000);
  });

  test('setTarget无效金额返回false', function () {
    assert.strictEqual(App.PiggyBank.setTarget(0), false);
    assert.strictEqual(App.PiggyBank.setTarget(-100), false);
    assert.strictEqual(App.PiggyBank.setTarget('abc'), false);
  });

  test('deposit存入', function () {
    const result = App.PiggyBank.deposit(100, '工资存入');
    assert.ok(result);
    assert.strictEqual(App.PiggyBank.get().currentAmount, 100);
    assert.strictEqual(App.PiggyBank.get().history.length, 1);
    assert.strictEqual(App.PiggyBank.get().history[0].type, 'deposit');
    assert.strictEqual(App.PiggyBank.get().history[0].note, '工资存入');
  });

  test('deposit无效金额返回false', function () {
    assert.strictEqual(App.PiggyBank.deposit(0), false);
    assert.strictEqual(App.PiggyBank.deposit(-50), false);
    assert.strictEqual(App.PiggyBank.get().currentAmount, 0);
  });

  test('withdraw取出', function () {
    App.PiggyBank.deposit(200);
    const result = App.PiggyBank.withdraw(50, '买东西');
    assert.ok(result);
    assert.strictEqual(App.PiggyBank.get().currentAmount, 150);
    assert.strictEqual(App.PiggyBank.get().history.length, 2);
    assert.strictEqual(App.PiggyBank.get().history[1].type, 'withdraw');
  });

  test('withdraw超过余额返回false', function () {
    App.PiggyBank.deposit(50);
    assert.strictEqual(App.PiggyBank.withdraw(100), false);
    assert.strictEqual(App.PiggyBank.get().currentAmount, 50);
  });

  test('withdraw无效金额返回false', function () {
    App.PiggyBank.deposit(100);
    assert.strictEqual(App.PiggyBank.withdraw(0), false);
    assert.strictEqual(App.PiggyBank.withdraw(-10), false);
  });

  test('getProgress返回进度', function () {
    App.PiggyBank.setTarget(1000);
    App.PiggyBank.deposit(500);
    const progress = App.PiggyBank.getProgress();
    assert.strictEqual(progress.current, 500);
    assert.strictEqual(progress.target, 1000);
    assert.strictEqual(progress.percent, 50);
  });

  test('getProgress未设置目标返回0%', function () {
    App.PiggyBank.deposit(100);
    const progress = App.PiggyBank.getProgress();
    assert.strictEqual(progress.percent, 0);
  });

  test('getProgress超过100%截断为100', function () {
    App.PiggyBank.setTarget(100);
    App.PiggyBank.deposit(200);
    const progress = App.PiggyBank.getProgress();
    assert.strictEqual(progress.percent, 100);
  });

  test('reset重置', function () {
    App.PiggyBank.setTarget(1000);
    App.PiggyBank.deposit(500);
    App.PiggyBank.reset();
    const piggy = App.PiggyBank.get();
    assert.strictEqual(piggy.targetAmount, 0);
    assert.strictEqual(piggy.currentAmount, 0);
    assert.strictEqual(piggy.history.length, 0);
  });
});

describe('阶段7 - 挑战列表UI', function () {
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

  test('挑战列表渲染4个挑战', function () {
    const items = document.querySelectorAll('.challenge-item');
    assert.strictEqual(items.length, 4);
  });

  test('未加入挑战显示加入按钮', function () {
    const joinBtns = document.querySelectorAll('.challenge-join-btn');
    assert.strictEqual(joinBtns.length, 4, '全部未加入应显示4个加入按钮');
  });

  test('点击加入按钮加入挑战', function () {
    const joinBtn = document.querySelector('.challenge-join-btn');
    joinBtn.click();
    const all = window.App.Challenges.getAll();
    const joined = all.filter(c => c.status === 'active');
    assert.strictEqual(joined.length, 1, '应加入1个挑战');
  });

  test('加入后挑战显示进行中状态', function () {
    window.App.Challenges.join('no_milk_tea');
    window.ChallengeUI.render();
    const status = document.querySelector('.challenge-status');
    assert.ok(status, '应显示状态标签');
    assert.ok(status.textContent.includes('进行中') || status.textContent.includes('未加入'));
  });

  test('进行中挑战显示进度条', function () {
    window.App.Challenges.join('no_milk_tea');
    window.ChallengeUI.render();
    const progressBars = document.querySelectorAll('.challenge-progress-bar');
    assert.ok(progressBars.length >= 1, '进行中挑战应显示进度条');
  });
});

describe('阶段7 - 存钱罐UI', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.PiggyUI.init();
    window.PiggyUI.render();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('存钱罐显示默认金额0', function () {
    assert.strictEqual(document.getElementById('piggyCurrent').textContent, '¥0.00');
  });

  test('存钱罐显示未设置目标', function () {
    assert.ok(document.getElementById('piggyTarget').textContent.includes('未设置'));
  });

  test('存入后金额增加', function () {
    window.App.PiggyBank.deposit(100);
    window.PiggyUI.render();
    assert.strictEqual(document.getElementById('piggyCurrent').textContent, '¥100.00');
  });

  test('取出后金额减少', function () {
    window.App.PiggyBank.deposit(200);
    window.App.PiggyBank.withdraw(50);
    window.PiggyUI.render();
    assert.strictEqual(document.getElementById('piggyCurrent').textContent, '¥150.00');
  });

  test('设置目标后进度更新', function () {
    window.App.PiggyBank.setTarget(1000);
    window.App.PiggyBank.deposit(250);
    window.PiggyUI.render();
    assert.ok(document.getElementById('piggyTarget').textContent.includes('25%'));
    assert.strictEqual(document.getElementById('piggyProgressFill').style.width, '25%');
  });

  test('有3个操作按钮', function () {
    assert.ok(document.getElementById('piggyDepositBtn'));
    assert.ok(document.getElementById('piggyWithdrawBtn'));
    assert.ok(document.getElementById('piggyTargetBtn'));
  });
});
