/**
 * 阶段4测试：分类管理与预算监控
 * 测试设置页、分类管理、预算管理、五级提醒
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

describe('阶段4 - 设置页渲染', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.SettingsUI.init();
    window.SettingsUI.render();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('设置页显示宠物头像和名字', function () {
    const avatar = document.getElementById('settingsAvatar').textContent;
    assert.ok(avatar, '应显示宠物头像');
    assert.strictEqual(document.getElementById('settingsName').textContent, '小橘');
  });

  test('设置页显示预算金额', function () {
    const val = document.getElementById('settingBudgetValue').textContent;
    assert.ok(val.includes('1200'), '应显示¥1200/月');
  });

  test('设置页显示分类数量', function () {
    const val = document.getElementById('settingCategoryValue').textContent;
    assert.ok(val.includes('7'), '应显示7个');
  });

  test('心情开关默认开启', function () {
    assert.ok(document.getElementById('moodToggle').classList.contains('on'), '心情开关默认开启');
  });

  test('提醒开关默认开启', function () {
    assert.ok(document.getElementById('reminderToggle').classList.contains('on'), '提醒开关默认开启');
  });

  test('点击心情开关切换状态', function () {
    const toggle = document.getElementById('moodToggle');
    toggle.click();
    assert.ok(!toggle.classList.contains('on'), '点击后应关闭');
    const settings = window.App.Storage.get('settings');
    assert.strictEqual(settings.moodEnabled, false, '设置应保存为false');
    toggle.click();
    assert.ok(toggle.classList.contains('on'), '再次点击应开启');
  });

  test('点击提醒开关切换状态', function () {
    const toggle = document.getElementById('reminderToggle');
    toggle.click();
    assert.ok(!toggle.classList.contains('on'));
    const budget = window.App.Budget.get();
    assert.strictEqual(budget.reminderEnabled, false, '预算提醒应关闭');
  });

  test('点击预算管理打开预算管理页', function () {
    document.getElementById('settingBudget').click();
    assert.ok(document.getElementById('budgetManageOverlay').classList.contains('show'), '预算管理页应打开');
  });

  test('点击分类管理打开分类管理页', function () {
    document.getElementById('settingCategory').click();
    assert.ok(document.getElementById('categoryManageOverlay').classList.contains('show'), '分类管理页应打开');
  });
});

describe('阶段4 - 分类管理', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.CategoryManagerUI.init();
    window.CategoryManagerUI.open();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('分类列表渲染7个预设分类', function () {
    const items = document.querySelectorAll('.cat-manage-item');
    assert.strictEqual(items.length, 7, '应有7个分类');
  });

  test('预设分类显示预设标签且无删除按钮', function () {
    const firstItem = document.querySelector('.cat-manage-item');
    assert.ok(firstItem.querySelector('.cat-manage-tag'), '预设分类应显示标签');
    assert.strictEqual(firstItem.querySelectorAll('.cat-manage-btn.danger').length, 0, '预设分类无删除按钮');
  });

  test('新增分类按钮存在', function () {
    assert.ok(document.getElementById('categoryAddBtn'), '应有新增按钮');
  });

  test('返回按钮关闭分类管理页', function () {
    document.getElementById('categoryManageBack').click();
    assert.ok(!document.getElementById('categoryManageOverlay').classList.contains('show'), '应关闭');
  });

  test('新增分类后列表更新', function () {
    const before = window.App.Categories.getAll().length;
    window.App.Categories.add('医疗', '💊');
    window.CategoryManagerUI.render();
    const items = document.querySelectorAll('.cat-manage-item');
    assert.strictEqual(items.length, before + 1, '应增加1个分类');
  });

  test('编辑分类名称', function () {
    const cat = window.App.Categories.add('测试分类', '🧪');
    window.App.Categories.update(cat.id, '改名后', '💊');
    const updated = window.App.Categories.getById(cat.id);
    assert.strictEqual(updated.name, '改名后');
  });

  test('删除无记录的自定义分类', function () {
    const cat = window.App.Categories.add('待删除', '🗑️');
    const result = window.App.Categories.delete(cat.id);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.movedCount, 0);
    assert.strictEqual(window.App.Categories.getById(cat.id), null);
  });

  test('删除有记录的分类迁移到其他', function () {
    const cat = window.App.Categories.add('测试分类', '🧪');
    window.App.Records.add(50, cat.id, '测试记录');
    const result = window.App.Categories.delete(cat.id);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.movedCount, 1, '应迁移1条记录');
    const otherRecords = window.App.Records.getByCategory('cat_other');
    assert.strictEqual(otherRecords.length, 1, '其他分类应有1条');
  });

  test('删除预设分类被拒绝', function () {
    const result = window.App.Categories.delete('cat_food');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, '预设分类不可删除');
  });
});

describe('阶段4 - 预算管理', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.BudgetManagerUI.init();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('打开预算管理页显示当前预算', function () {
    window.BudgetManagerUI.open();
    assert.ok(document.getElementById('budgetManageAmount').textContent.includes('1200'));
    assert.ok(document.getElementById('budgetManageOverlay').classList.contains('show'));
  });

  test('预算管理页显示已用和剩余', function () {
    window.App.Records.add(300, 'cat_food');
    window.BudgetManagerUI.open();
    assert.ok(document.getElementById('budgetManageUsed').textContent.includes('300'));
    assert.ok(document.getElementById('budgetManageRemaining').textContent.includes('900'));
  });

  test('修改预算金额并保存', function () {
    window.BudgetManagerUI.open();
    document.getElementById('budgetAmountInput').value = '2000';
    window.BudgetManagerUI.save();
    const budget = window.App.Budget.get();
    assert.strictEqual(budget.monthlyAmount, 2000, '预算应更新为2000');
  });

  test('输入无效金额不保存', function () {
    window.BudgetManagerUI.open();
    document.getElementById('budgetAmountInput').value = '-100';
    window.BudgetManagerUI.save();
    const budget = window.App.Budget.get();
    assert.strictEqual(budget.monthlyAmount, 1200, '无效金额不应保存');
  });

  test('关闭预算管理页', function () {
    window.BudgetManagerUI.open();
    document.getElementById('budgetManageBack').click();
    assert.ok(!document.getElementById('budgetManageOverlay').classList.contains('show'));
  });
});

describe('阶段4 - 五级提醒', function () {
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

  function sendMessage(text) {
    const input = document.getElementById('chatInput');
    input.value = text;
    document.getElementById('chatSendBtn').click();
  }

  function getLastMessage() {
    const msgs = document.querySelectorAll('.chat-msg');
    return msgs[msgs.length - 1].textContent;
  }

  test('50%预算触发温和提示', function () {
    // 先记599元（不到50%），再记1元达到600（50%）
    window.App.Records.add(599, 'cat_shopping');
    sendMessage('吃饭 1 元');
    const lastMsg = getLastMessage();
    assert.ok(lastMsg.includes('已用一半') || lastMsg.includes('继续保持'), '应触发50%温和提示，实际：' + lastMsg);
  });

  test('80%预算触发黄色预警弹窗', function () {
    window.App.Records.add(959, 'cat_shopping'); // 79.9%
    sendMessage('吃饭 1 元'); // 达到960=80%
    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'), '应弹出预警弹窗');
    const title = document.getElementById('modalTitle').textContent;
    assert.ok(title.includes('预警') || title.includes('80%'), '弹窗标题应包含预警');
  });

  test('90%预算触发二次确认弹窗', function () {
    window.App.Records.add(1000, 'cat_shopping'); // 83.3%
    sendMessage('吃饭 100 元'); // 达到1100=91.7%
    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'), '应弹出二次确认弹窗');
    const content = document.getElementById('modalContent').textContent;
    assert.ok(content.includes('90%') || content.includes('警告'), '弹窗应包含90%警告');
  });

  test('90%二次确认识取消不保存记录', function () {
    window.App.Records.add(1000, 'cat_shopping');
    sendMessage('吃饭 100 元');
    // 点击取消按钮
    const buttons = document.querySelectorAll('#modalActions .btn');
    // 第一个是取消
    buttons[0].click();
    const records = window.App.Records.getAll();
    // 只有之前的1000元记录，新的100元不应保存
    const foodRecords = records.filter(r => r.categoryId === 'cat_food');
    assert.strictEqual(foodRecords.length, 0, '取消后不应保存餐饮记录');
  });

  test('90%二次确认点击确定保存记录', function () {
    window.App.Records.add(1000, 'cat_shopping');
    sendMessage('吃饭 100 元');
    const buttons = document.querySelectorAll('#modalActions .btn');
    buttons[1].click(); // 确定记账
    const records = window.App.Records.getAll();
    const foodRecords = records.filter(r => r.categoryId === 'cat_food');
    assert.strictEqual(foodRecords.length, 1, '确定后应保存餐饮记录');
    assert.strictEqual(foodRecords[0].amount, 100);
  });

  test('100%预算触发撒花和庆祝', function () {
    window.App.Records.add(1100, 'cat_shopping'); // 91.7%
    sendMessage('吃饭 100 元'); // 达到1200=100%
    // 检查撒花
    const confetti = document.getElementById('confettiContainer');
    assert.ok(confetti.children.length > 0, '应触发撒花');
    // 检查庆祝消息
    const lastMsg = getLastMessage();
    assert.ok(lastMsg.includes('精准达标') || lastMsg.includes('撒花'), '应显示庆祝消息');
  });

  test('超支触发超支分析消息', function () {
    // 先达到100%（标记notified[100]=true），再超支
    window.App.Records.add(1200, 'cat_shopping');
    window.App.Budget.checkThreshold(); // 标记100%已通知
    sendMessage('吃饭 50 元'); // 超支50
    const lastMsg = getLastMessage();
    assert.ok(lastMsg.includes('超支') || lastMsg.includes('😿'), '应显示超支分析，实际：' + lastMsg);
  });

  test('关闭提醒后不触发预算弹窗', function () {
    window.App.Budget.setReminder(false);
    window.App.Records.add(959, 'cat_shopping');
    sendMessage('吃饭 1 元'); // 达到80%
    const modal = document.getElementById('modalOverlay');
    assert.ok(!modal.classList.contains('show'), '关闭提醒后不应弹预警弹窗');
  });

  test('50%提醒只触发一次', function () {
    window.App.Records.add(600, 'cat_shopping'); // 50%
    window.App.Budget.checkThreshold(); // 触发并标记
    const triggered = window.App.Budget.checkThreshold(); // 再次检查
    assert.strictEqual(triggered.find(t => t.key === 50), undefined, '50%不应重复触发');
  });

  test('跨月后提醒状态重置', function () {
    const budget = window.App.Budget.get();
    budget.notifyMonth = '2026-08';
    budget.notified = { 50: true, 80: true, 90: true, 100: true };
    window.App.Storage.set('budget', budget);
    window.App.Budget.resetIfNewMonth();
    const reset = window.App.Budget.get();
    assert.strictEqual(reset.notified[50], false, '跨月后50%应重置');
    assert.strictEqual(reset.notified[80], false, '跨月后80%应重置');
  });
});
