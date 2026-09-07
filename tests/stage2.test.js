/**
 * 阶段2测试：核心记账流程（聊天首页UI）
 * 使用jsdom加载HTML，测试DOM交互和记账逻辑
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// 辅助：创建jsdom环境，内联core.js
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

describe('阶段2 - 聊天首页UI', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    // 重新初始化
    window.App.init();
    window.ChatUI.init();
  });

  afterEach(function () {
    if (dom) dom.window.close();
  });

  test('页面初始化后显示欢迎消息', function () {
    const messages = document.querySelectorAll('.chat-msg');
    assert.ok(messages.length >= 1, '应至少有1条消息');
    const welcomeText = messages[0].textContent;
    assert.ok(welcomeText.includes('小橘') || welcomeText.includes('记账'), '应显示欢迎消息');
  });

  test('快捷分类标签渲染7个预设分类', function () {
    const tags = document.querySelectorAll('.quick-cat-tag');
    assert.strictEqual(tags.length, 7, '应有7个快捷分类标签');
    assert.ok(tags[0].textContent.includes('餐饮'), '第一个应为餐饮');
    assert.ok(tags[6].textContent.includes('其他'), '最后一个应为其他');
  });

  test('点击快捷分类标签填入输入框', function () {
    const tags = document.querySelectorAll('.quick-cat-tag');
    tags[0].click(); // 餐饮
    const input = document.getElementById('chatInput');
    assert.ok(input.value.includes('餐饮'), '输入框应填入餐饮');
    assert.ok(tags[0].classList.contains('active'), '点击的标签应高亮');
  });

  test('输入有效内容后发送，显示用户气泡和系统确认气泡', function () {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    input.value = '吃饭 25 元';
    sendBtn.click();

    const messages = document.querySelectorAll('.chat-msg');
    // 欢迎消息 + 用户消息 + 系统确认 = 3条
    assert.strictEqual(messages.length, 3, '应有3条消息（欢迎+用户+确认）');
    // 用户消息（右侧）
    const userMsg = messages[1];
    assert.ok(userMsg.classList.contains('chat-msg-right'), '第二条应为用户消息');
    assert.ok(userMsg.textContent.includes('吃饭 25 元'), '用户消息应显示输入内容');
    // 系统确认（左侧）
    const sysMsg = messages[2];
    assert.ok(sysMsg.classList.contains('chat-msg-left'), '第三条应为系统消息');
    assert.ok(sysMsg.textContent.includes('已记录'), '应显示已记录');
    assert.ok(sysMsg.textContent.includes('餐饮'), '应显示分类餐饮');
    assert.ok(sysMsg.textContent.includes('25'), '应显示金额25');
    assert.ok(sysMsg.textContent.includes('时间'), '应显示时间');
  });

  test('记账后记录保存到Storage', function () {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    input.value = '奶茶 15';
    sendBtn.click();

    const records = window.App.Storage.get('records');
    assert.strictEqual(records.length, 1, '应有1条记录');
    assert.strictEqual(records[0].amount, 15, '金额应为15');
    assert.strictEqual(records[0].categoryName, '餐饮', '分类应为餐饮');
    assert.ok(records[0].date, '应有日期');
    assert.ok(records[0].time, '应有时间');
  });

  test('输入无效内容后发送，显示提示消息', function () {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    input.value = '今天天气好';
    sendBtn.click();

    const messages = document.querySelectorAll('.chat-msg');
    // 欢迎 + 用户 + 提示 = 3条
    assert.strictEqual(messages.length, 3);
    const tipMsg = messages[2];
    assert.ok(tipMsg.classList.contains('chat-msg-left'), '提示应为左侧消息');
    assert.ok(tipMsg.textContent.includes('没看懂') || tipMsg.textContent.includes('试试'), '应显示识别失败提示');
    assert.ok(tipMsg.textContent.includes('吃饭 25 元'), '应给出输入示例');
    // 不应保存记录
    assert.strictEqual(window.App.Storage.get('records').length, 0, '不应保存记录');
  });

  test('空输入不发送消息', function () {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    input.value = '   ';
    sendBtn.click();
    const messages = document.querySelectorAll('.chat-msg');
    assert.strictEqual(messages.length, 1, '空输入不应添加消息（只有欢迎）');
  });

  test('只有金额无分类不保存', function () {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    input.value = '25元';
    sendBtn.click();
    const messages = document.querySelectorAll('.chat-msg');
    // 欢迎 + 用户 + 提示 = 3条
    assert.strictEqual(messages.length, 3);
    assert.strictEqual(window.App.Storage.get('records').length, 0, '无分类不应保存');
  });

  test('记账后今日总开销更新', function () {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const todayEl = document.getElementById('chatTodayTotal');
    assert.ok(todayEl.textContent.includes('¥0'), '初始今日应为0');

    input.value = '吃饭 25 元';
    sendBtn.click();
    assert.ok(todayEl.textContent.includes('25'), '记账后今日应显示25');

    input.value = '奶茶 15';
    sendBtn.click();
    assert.ok(todayEl.textContent.includes('40'), '两笔后今日应显示40');
  });

  test('记账后触发record:added事件', function () {
    let eventFired = false;
    let eventRecord = null;
    window.addEventListener('record:added', (e) => {
      eventFired = true;
      eventRecord = e.detail.record;
    });

    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    input.value = '吃饭 25 元';
    sendBtn.click();

    assert.ok(eventFired, '应触发record:added事件');
    assert.ok(eventRecord, '事件应携带record');
    assert.strictEqual(eventRecord.amount, 25);
  });

  test('头部显示宠物信息', function () {
    const avatar = document.getElementById('chatPetAvatar');
    const name = document.getElementById('chatPetName');
    const mood = document.getElementById('chatPetMood');
    assert.ok(avatar.textContent, '应显示宠物头像');
    assert.strictEqual(name.textContent, '小橘', '宠物名应为小橘');
    assert.ok(mood.textContent, '应显示心情');
  });

  test('点击宠物信息跳转到宠物页', function () {
    const petInfo = document.getElementById('chatPetInfo');
    petInfo.click();
    const petPage = document.getElementById('page-pet');
    assert.ok(petPage.classList.contains('active'), '宠物页应激活');
  });

  test('多笔记账后消息按顺序显示', function () {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');

    input.value = '吃饭 25 元';
    sendBtn.click();
    input.value = '奶茶 15';
    sendBtn.click();
    input.value = '打车 20 元';
    sendBtn.click();

    const messages = document.querySelectorAll('.chat-msg');
    // 欢迎 + 3*(用户+确认) = 7条
    assert.strictEqual(messages.length, 7);
    // 记录数
    assert.strictEqual(window.App.Storage.get('records').length, 3);
  });

  test('记账后lastCategoryId更新，快捷标签高亮', function () {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');

    input.value = '打车 20 元';
    sendBtn.click();

    const settings = window.App.Storage.get('settings');
    assert.strictEqual(settings.lastCategoryId, 'cat_transport', 'lastCategoryId应为交通');

    // 重新渲染快捷分类后交通标签应高亮
    window.ChatUI.renderQuickCats();
    const activeTag = document.querySelector('.quick-cat-tag.active');
    assert.ok(activeTag.textContent.includes('交通'), '交通标签应高亮');
  });

  test('回车键发送消息', function () {
    const input = document.getElementById('chatInput');
    input.value = '吃饭 25 元';
    // 模拟回车键
    const event = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    input.dispatchEvent(event);

    const messages = document.querySelectorAll('.chat-msg');
    assert.strictEqual(messages.length, 3, '回车应发送消息');
    assert.strictEqual(window.App.Storage.get('records').length, 1);
  });
});
