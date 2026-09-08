/**
 * 阶段10测试：页面布局适配与状态栏修复
 * 测试Android布局fitsSystemWindows、CSS安全区处理、100dvh视口高度
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

describe('阶段10 - Android布局适配', function () {
  test('activity_main.xml中CoordinatorLayout包含fitsSystemWindows=true', function () {
    const xml = fs.readFileSync(path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'res', 'layout', 'activity_main.xml'), 'utf8');
    assert.ok(xml.includes('android:fitsSystemWindows="true"'), 'CoordinatorLayout应包含fitsSystemWindows=true');
  });

  test('activity_main.xml中WebView包含fitsSystemWindows=true', function () {
    const xml = fs.readFileSync(path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'res', 'layout', 'activity_main.xml'), 'utf8');
    const webViewMatch = xml.match(/<WebView[\s\S]*?\/>/);
    assert.ok(webViewMatch, '应包含WebView元素');
    assert.ok(webViewMatch[0].includes('android:fitsSystemWindows="true"'), 'WebView应包含fitsSystemWindows=true');
  });

  test('styles.xml中状态栏颜色为奶油白', function () {
    const xml = fs.readFileSync(path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml'), 'utf8');
    assert.ok(xml.includes('#FFF8F0'), '状态栏颜色应为奶油白#FFF8F0');
    assert.ok(xml.includes('windowLightStatusBar'), '应设置状态栏文字为深色');
  });
});

describe('阶段10 - CSS安全区处理', function () {
  let css;

  beforeEach(function () {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'www', 'index.html'), 'utf8');
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    assert.ok(styleMatch, '应包含style标签');
    css = styleMatch[1];
  });

  test('.app-container包含safe-area-inset-top顶部安全区', function () {
    assert.ok(css.includes('env(safe-area-inset-top)'), 'CSS应包含顶部安全区safe-area-inset-top');
  });

  test('.app-container使用max()确保至少28px顶部padding', function () {
    const containerMatch = css.match(/\.app-container\s*\{([\s\S]*?)\}/);
    assert.ok(containerMatch, '应包含.app-container样式');
    assert.ok(containerMatch[1].includes('max(28px'), '应使用max(28px, ...)确保至少28px顶部padding');
  });

  test('.app-container包含100dvh动态视口高度', function () {
    assert.ok(css.includes('100dvh'), 'CSS应包含100dvh动态视口高度');
  });

  test('.app-container包含box-sizing:border-box', function () {
    const containerMatch = css.match(/\.app-container\s*\{([\s\S]*?)\}/);
    assert.ok(containerMatch, '应包含.app-container样式');
    assert.ok(containerMatch[1].includes('box-sizing'), '.app-container应包含box-sizing');
    assert.ok(containerMatch[1].includes('border-box'), '.app-container的box-sizing应为border-box');
  });

  test('.app-container底部padding包含safe-area-inset-bottom', function () {
    const containerMatch = css.match(/\.app-container\s*\{([\s\S]*?)\}/);
    assert.ok(containerMatch, '应包含.app-container样式');
    assert.ok(containerMatch[1].includes('env(safe-area-inset-bottom)'), '底部padding应包含safe-area-inset-bottom');
  });

  test('#page-chat包含100dvh高度', function () {
    const chatMatch = css.match(/#page-chat\s*\{([\s\S]*?)\}/);
    assert.ok(chatMatch, '应包含#page-chat样式');
    assert.ok(chatMatch[1].includes('100dvh'), '#page-chat应包含100dvh高度');
  });

  test('.page通用样式包含100dvh', function () {
    const pageMatch = css.match(/\.page\s*\{([\s\S]*?)\}/);
    assert.ok(pageMatch, '应包含.page通用样式');
    assert.ok(pageMatch[1].includes('100dvh'), '.page应包含100dvh最小高度');
  });

  test('.bottom-nav底部导航包含safe-area-inset-bottom', function () {
    const navMatch = css.match(/\.bottom-nav\s*\{([\s\S]*?)\}/);
    assert.ok(navMatch, '应包含.bottom-nav样式');
    assert.ok(navMatch[1].includes('env(safe-area-inset-bottom)'), '底部导航应包含safe-area-inset-bottom');
  });

  test('viewport meta包含viewport-fit=cover', function () {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'www', 'index.html'), 'utf8');
    assert.ok(html.includes('viewport-fit=cover'), 'viewport应包含viewport-fit=cover');
  });

  test('弹窗按钮容器支持flex-wrap换行', function () {
    const actionsMatch = css.match(/\.modal-actions\s*\{([\s\S]*?)\}/);
    assert.ok(actionsMatch, '应包含.modal-actions样式');
    assert.ok(actionsMatch[1].includes('flex-wrap'), '弹窗按钮容器应支持flex-wrap换行');
    assert.ok(actionsMatch[1].includes('wrap'), 'flex-wrap值应为wrap');
  });

  test('宠物日历今天已打卡时文字为白色', function () {
    assert.ok(css.includes('.calendar-day.today.checked'), '应包含.calendar-day.today.checked样式');
    const todayCheckedMatch = css.match(/\.calendar-day\.today\.checked\s*\{([\s\S]*?)\}/);
    assert.ok(todayCheckedMatch, '应能匹配到.calendar-day.today.checked样式块');
    assert.ok(todayCheckedMatch[1].includes('#fff') || todayCheckedMatch[1].includes('white'), '今天已打卡时文字应为白色');
  });
});

describe('阶段10 - 页面渲染验证', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
  });

  afterEach(function () {
    dom.window.close();
  });

  test('页面包含.app-container容器', function () {
    const container = document.querySelector('.app-container');
    assert.ok(container, '页面应包含.app-container');
  });

  test('页面包含底部导航栏', function () {
    const nav = document.querySelector('.bottom-nav');
    assert.ok(nav, '页面应包含.bottom-nav');
  });

  test('底部导航栏包含5个导航项', function () {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    assert.ok(navItems.length >= 5, '底部导航栏应包含至少5个导航项，实际：' + navItems.length);
  });

  test('聊天页面包含输入框区域', function () {
    const inputArea = document.querySelector('.chat-input-area');
    assert.ok(inputArea, '聊天页面应包含.chat-input-area');
  });

  test('聊天页面包含消息区域', function () {
    const messages = document.querySelector('.chat-messages');
    assert.ok(messages, '聊天页面应包含.chat-messages');
  });

  test('所有page元素存在', function () {
    const pages = ['page-chat', 'page-overview', 'page-bills', 'page-pet', 'page-me'];
    pages.forEach(id => {
      const el = document.getElementById(id);
      assert.ok(el, '页面应包含#' + id);
    });
  });
});
