/**
 * 阶段9测试：数据管理与设置
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

describe('阶段9 - 数据管理覆盖层', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.DataManagerUI.init();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('数据管理覆盖层存在', function () {
    assert.ok(document.getElementById('dataManageOverlay'));
  });

  test('有导出、导入、清空三个按钮', function () {
    assert.ok(document.getElementById('exportDataBtn'));
    assert.ok(document.getElementById('importDataBtn'));
    assert.ok(document.getElementById('clearDataBtn'));
  });

  test('open打开覆盖层', function () {
    window.DataManagerUI.open();
    assert.ok(document.getElementById('dataManageOverlay').classList.contains('show'));
  });

  test('close关闭覆盖层', function () {
    window.DataManagerUI.open();
    window.DataManagerUI.close();
    assert.ok(!document.getElementById('dataManageOverlay').classList.contains('show'));
  });

  test('点击返回按钮关闭覆盖层', function () {
    window.DataManagerUI.open();
    document.getElementById('dataManageBack').click();
    assert.ok(!document.getElementById('dataManageOverlay').classList.contains('show'));
  });

  test('设置页数据管理入口打开覆盖层', function () {
    window.SettingsUI.init();
    document.getElementById('settingData').click();
    assert.ok(document.getElementById('dataManageOverlay').classList.contains('show'));
  });
});

describe('阶段9 - 导出数据', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.DataManagerUI.init();
    // 添加一些测试数据
    window.App.Records.add(25, 'cat_food', '', null, null, '吃饭');
    // mock URL.createObjectURL
    window.URL.createObjectURL = () => 'blob:mock-url';
    window.URL.revokeObjectURL = () => {};
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('导出数据生成包含记录的JSON', function () {
    let capturedBlob = null;
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function (tag) {
      if (tag === 'a') {
        const a = origCreateElement('a');
        a.click = () => {};
        return a;
      }
      return origCreateElement(tag);
    };
    const origBlob = window.Blob;
    window.Blob = function (parts, options) {
      capturedBlob = { parts: parts, options: options };
      return { size: parts[0].length };
    };
    window.DataManagerUI.exportData();
    assert.ok(capturedBlob, '应创建Blob');
    assert.strictEqual(capturedBlob.options.type, 'application/json');
    const data = JSON.parse(capturedBlob.parts[0]);
    assert.ok(data.records, '应包含records');
    assert.ok(data.categories, '应包含categories');
    assert.ok(data.budget, '应包含budget');
    assert.ok(data.pet, '应包含pet');
    assert.strictEqual(data.records.length, 1, '应包含1条记录');
    assert.strictEqual(data.records[0].name, '吃饭');
    window.Blob = origBlob;
    document.createElement = origCreateElement;
  });

  test('导出后显示成功弹窗', function () {
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function (tag) {
      if (tag === 'a') {
        const a = origCreateElement('a');
        a.click = () => {};
        return a;
      }
      return origCreateElement(tag);
    };
    const origBlob = window.Blob;
    window.Blob = function () { return { size: 100 }; };
    window.DataManagerUI.exportData();
    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'), '应显示导出成功弹窗');
    assert.ok(document.getElementById('modalTitle').textContent.includes('导出成功'));
    window.Blob = origBlob;
    document.createElement = origCreateElement;
  });
});

describe('阶段9 - 导入数据', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.DataManagerUI.init();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('点击导入按钮触发文件选择', function () {
    let clicked = false;
    const input = document.getElementById('importFileInput');
    input.click = () => { clicked = true; };
    document.getElementById('importDataBtn').click();
    assert.ok(clicked, '应触发文件选择');
  });

  test('导入有效JSON数据后覆盖现有数据', function () {
    // 先添加一些现有数据
    window.App.Records.add(100, 'cat_food');
    assert.strictEqual(window.App.Records.getAll().length, 1);

    // 构造导入数据
    const importData = {
      records: [
        { id: 'r1', amount: 50, categoryId: 'cat_shopping', categoryName: '购物', categoryIcon: '🛍️', name: '衣服', note: '', mood: null, timestamp: Date.now(), date: '2026-09-01', time: '10:00' }
      ],
      categories: window.App.Categories.getAll(),
      budget: { monthlyAmount: 2000, reminderEnabled: true, notified: { 50: false, 80: false, 90: false, 100: false }, notifyMonth: '2026-09' },
      pet: { name: '测试猫', level: 3, exp: 50, totalExp: 200, lastInteract: Date.now() },
      badges: [],
      checkin: { continuousDays: 5, lastCheckinDate: '2026-09-07', totalDays: 10, checkinDates: ['2026-09-07'] },
      settings: { moodEnabled: true, budgetReminderEnabled: true, lastCategoryId: null }
    };

    // 模拟文件选择和FileReader
    const mockFile = { name: 'backup.json' };
    const mockReader = {
      readAsText: function () {
        this.onload({ target: { result: JSON.stringify(importData) } });
      }
    };
    window.FileReader = function () { return mockReader; };

    // 触发文件选择事件
    const input = document.getElementById('importFileInput');
    Object.defineProperty(input, 'files', { value: [mockFile], configurable: true });
    input.dispatchEvent(new window.Event('change'));

    // 此时应弹出确认弹窗
    let modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'), '应弹出确认导入弹窗');
    assert.ok(document.getElementById('modalTitle').textContent.includes('确认导入'));

    // 点击确认导入按钮（用文本匹配，因为取消按钮也是btn-primary class）
    const buttons = document.querySelectorAll('#modalActions .btn');
    const confirmBtn = Array.from(buttons).find(b => b.textContent.includes('确认导入'));
    assert.ok(confirmBtn, '应有确认导入按钮');
    confirmBtn.click();

    // 验证数据已覆盖
    const records = window.App.Records.getAll();
    assert.strictEqual(records.length, 1, '应只有导入的1条记录');
    assert.strictEqual(records[0].name, '衣服');
    assert.strictEqual(window.App.Pet.get().name, '测试猫');
    assert.strictEqual(window.App.Budget.get().monthlyAmount, 2000);
  });

  test('导入缺少必需字段的JSON显示错误', function () {
    const invalidData = { foo: 'bar' };
    const mockFile = { name: 'bad.json' };
    const mockReader = {
      readAsText: function () {
        this.onload({ target: { result: JSON.stringify(invalidData) } });
      }
    };
    window.FileReader = function () { return mockReader; };

    const input = document.getElementById('importFileInput');
    Object.defineProperty(input, 'files', { value: [mockFile], configurable: true });
    input.dispatchEvent(new window.Event('change'));

    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'));
    assert.ok(document.getElementById('modalTitle').textContent.includes('导入失败'));
  });

  test('导入无效JSON显示解析失败', function () {
    const mockFile = { name: 'bad.json' };
    const mockReader = {
      readAsText: function () {
        this.onload({ target: { result: 'not valid json{{{' } });
      }
    };
    window.FileReader = function () { return mockReader; };

    const input = document.getElementById('importFileInput');
    Object.defineProperty(input, 'files', { value: [mockFile], configurable: true });
    input.dispatchEvent(new window.Event('change'));

    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'));
    assert.ok(document.getElementById('modalContent').textContent.includes('解析失败'));
  });
});

describe('阶段9 - 清空数据', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.DataManagerUI.init();
    // 添加测试数据
    window.App.Records.add(100, 'cat_food');
    window.App.Pet.setName('测试猫');
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('点击清空按钮弹出确认输入框', function () {
    document.getElementById('clearDataBtn').click();
    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'));
    assert.ok(document.getElementById('modalTitle').textContent.includes('清空数据'));
    assert.ok(document.getElementById('clearConfirmInput'), '应有确认输入框');
  });

  test('输入错误文字不继续', function () {
    document.getElementById('clearDataBtn').click();
    document.getElementById('clearConfirmInput').value = '取消';
    // 点击下一步按钮
    const nextBtn = document.querySelector('.btn-danger');
    nextBtn.click();
    // 应弹出提示
    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'));
    assert.ok(document.getElementById('modalContent').textContent.includes('请输入') ||
      document.getElementById('modalTitle').textContent.includes('提示'));
  });

  test('输入「确认」后弹出最终确认', function () {
    document.getElementById('clearDataBtn').click();
    document.getElementById('clearConfirmInput').value = '确认';
    const nextBtn = document.querySelector('.btn-danger');
    nextBtn.click();
    // 应弹出最终确认
    assert.ok(document.getElementById('modalTitle').textContent.includes('最终确认'));
  });

  test('确认清空后数据恢复初始', function () {
    document.getElementById('clearDataBtn').click();
    document.getElementById('clearConfirmInput').value = '确认';
    document.querySelector('.btn-danger').click();
    // 点击最终确认的"确定清空"按钮
    const finalBtn = document.querySelector('.btn-danger');
    finalBtn.click();
    // 验证数据已清空
    assert.strictEqual(window.App.Records.getAll().length, 0, '记录应清空');
    assert.strictEqual(window.App.Pet.get().name, '小橘', '宠物应恢复默认');
    assert.strictEqual(window.App.Budget.get().monthlyAmount, 1200, '预算应恢复默认');
  });

  test('最终确认点取消不清空', function () {
    document.getElementById('clearDataBtn').click();
    document.getElementById('clearConfirmInput').value = '确认';
    document.querySelector('.btn-danger').click();
    // 点击取消按钮（第一个按钮）
    const cancelBtn = document.querySelectorAll('.btn')[0];
    cancelBtn.click();
    // 验证数据未清空
    assert.strictEqual(window.App.Records.getAll().length, 1, '记录不应清空');
    assert.strictEqual(window.App.Pet.get().name, '测试猫', '宠物不应恢复');
  });
});
