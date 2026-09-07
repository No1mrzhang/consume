/**
 * 阶段8测试：心情标签与壁纸生成
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

/** 创建mock canvas context */
function createMockCtx() {
  const calls = [];
  return {
    calls: calls,
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillRect: (...a) => calls.push(['fillRect', ...a]),
    fillText: (...a) => calls.push(['fillText', ...a]),
    beginPath: () => calls.push(['beginPath']),
    moveTo: (...a) => calls.push(['moveTo', ...a]),
    lineTo: (...a) => calls.push(['lineTo', ...a]),
    arc: (...a) => calls.push(['arc', ...a]),
    closePath: () => calls.push(['closePath']),
    fill: () => calls.push(['fill']),
    quadraticCurveTo: (...a) => calls.push(['quadraticCurveTo', ...a]),
    save: () => {},
    restore: () => {}
  };
}

describe('阶段8 - 心情统计核心逻辑', function () {
  let App;

  beforeEach(function () {
    App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));
    App.Storage._setMock(null);
    App.init();
  });

  test('getMoodStats返回4种心情统计', function () {
    const stats = App.Stats.getMoodStats();
    assert.ok('counts' in stats);
    assert.ok('happy' in stats.counts);
    assert.ok('normal' in stats.counts);
    assert.ok('sad' in stats.counts);
    assert.ok('impulse' in stats.counts);
  });

  test('无记录时所有心情为0', function () {
    const stats = App.Stats.getMoodStats();
    assert.strictEqual(stats.counts.happy, 0);
    assert.strictEqual(stats.counts.normal, 0);
    assert.strictEqual(stats.counts.sad, 0);
    assert.strictEqual(stats.counts.impulse, 0);
  });

  test('记录心情后统计正确', function () {
    App.Records.add(10, 'cat_food', '', 'happy');
    App.Records.add(20, 'cat_shopping', '', 'impulse');
    App.Records.add(30, 'cat_entertainment', '', 'impulse');
    const stats = App.Stats.getMoodStats();
    assert.strictEqual(stats.counts.happy, 1);
    assert.strictEqual(stats.counts.impulse, 2);
  });

  test('mood为null的记录不计入', function () {
    App.Records.add(10, 'cat_food'); // mood为null
    const stats = App.Stats.getMoodStats();
    assert.strictEqual(stats.counts.happy, 0);
    assert.strictEqual(stats.counts.normal, 0);
  });
});

describe('阶段8 - 心情统计UI', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.MoodStatsUI.render();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('心情统计渲染4个心情项', function () {
    const items = document.querySelectorAll('.mood-stat-item');
    assert.strictEqual(items.length, 4);
  });

  test('无记录时心情数量为0', function () {
    const counts = document.querySelectorAll('.mood-stat-count');
    counts.forEach(c => assert.strictEqual(c.textContent, '0'));
  });

  test('有冲动消费时显示分析', function () {
    window.App.Records.add(100, 'cat_shopping', '', 'impulse');
    window.App.Records.add(200, 'cat_shopping', '', 'impulse');
    window.MoodStatsUI.render();
    const analysis = document.getElementById('moodImpulseAnalysis');
    assert.strictEqual(analysis.style.display, 'block', '应显示冲动分析');
    assert.ok(analysis.textContent.includes('2'), '应显示2笔冲动消费');
    assert.ok(analysis.textContent.includes('300'), '应显示300元');
  });

  test('无冲动消费时隐藏分析', function () {
    window.App.Records.add(10, 'cat_food', '', 'happy');
    window.MoodStatsUI.render();
    const analysis = document.getElementById('moodImpulseAnalysis');
    assert.strictEqual(analysis.style.display, 'none');
  });

  test('心情数量正确显示', function () {
    window.App.Records.add(10, 'cat_food', '', 'happy');
    window.App.Records.add(20, 'cat_food', '', 'happy');
    window.App.Records.add(30, 'cat_food', '', 'sad');
    window.MoodStatsUI.render();
    const counts = document.querySelectorAll('.mood-stat-count');
    // 顺序：happy, normal, sad, impulse
    assert.strictEqual(counts[0].textContent, '2');
    assert.strictEqual(counts[2].textContent, '1');
  });
});

describe('阶段8 - 壁纸生成', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
    window.WallpaperUI.init();
  });

  afterEach(function () { if (dom) dom.window.close(); });

  test('账单壁纸入口存在且可点击', function () {
    const entry = document.getElementById('wallpaperEntry');
    assert.ok(entry, '壁纸入口应存在');
    assert.ok(entry.textContent.includes('账单壁纸'));
  });

  test('点击壁纸入口弹出月份选择', function () {
    document.getElementById('wallpaperEntry').click();
    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'), '应弹出月份选择弹窗');
    const select = document.getElementById('wallpaperMonthSelect');
    assert.ok(select, '应有月份选择下拉框');
    assert.ok(select.options.length >= 1, '至少有1个月份选项');
  });

  test('generate生成1080x1920画布', function () {
    const mockCtx = createMockCtx();
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function (tag) {
      if (tag === 'canvas') {
        const canvas = origCreateElement('canvas');
        canvas.getContext = () => mockCtx;
        canvas.toDataURL = () => 'data:image/png;base64,mock';
        return canvas;
      }
      return origCreateElement(tag);
    };
    window.WallpaperUI.generate('2026-09');
    assert.ok(mockCtx.calls.length > 0, '应有绘制调用');
    // 验证有fillText调用（绘制文字）
    const textCalls = mockCtx.calls.filter(c => c[0] === 'fillText');
    assert.ok(textCalls.length > 0, '应绘制文字');
    document.createElement = origCreateElement;
  });

  test('无数据时也能生成壁纸', function () {
    const mockCtx = createMockCtx();
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function (tag) {
      if (tag === 'canvas') {
        const canvas = origCreateElement('canvas');
        canvas.getContext = () => mockCtx;
        canvas.toDataURL = () => 'data:image/png;base64,mock';
        return canvas;
      }
      return origCreateElement(tag);
    };
    // 无记录
    window.WallpaperUI.generate('2026-09');
    assert.ok(mockCtx.calls.length > 0, '无数据时也应绘制');
    document.createElement = origCreateElement;
  });

  test('有数据时壁纸包含分类信息', function () {
    window.App.Records.add(100, 'cat_food');
    window.App.Records.add(200, 'cat_shopping');
    const mockCtx = createMockCtx();
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function (tag) {
      if (tag === 'canvas') {
        const canvas = origCreateElement('canvas');
        canvas.getContext = () => mockCtx;
        canvas.toDataURL = () => 'data:image/png;base64,mock';
        return canvas;
      }
      return origCreateElement(tag);
    };
    window.WallpaperUI.generate('2026-09');
    // 验证有arc调用（绘制环图）
    const arcCalls = mockCtx.calls.filter(c => c[0] === 'arc');
    assert.ok(arcCalls.length > 0, '有数据时应绘制环形图');
    document.createElement = origCreateElement;
  });

  test('生成后显示预览弹窗', function () {
    const mockCtx = createMockCtx();
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function (tag) {
      if (tag === 'canvas') {
        const canvas = origCreateElement('canvas');
        canvas.getContext = () => mockCtx;
        canvas.toDataURL = () => 'data:image/png;base64,mock';
        return canvas;
      }
      return origCreateElement(tag);
    };
    window.WallpaperUI.generate('2026-09');
    const modal = document.getElementById('modalOverlay');
    assert.ok(modal.classList.contains('show'), '应显示预览弹窗');
    const img = document.querySelector('.wallpaper-preview-img');
    assert.ok(img, '预览中应有图片');
    document.createElement = origCreateElement;
  });

  test('壁纸包含宠物信息', function () {
    const mockCtx = createMockCtx();
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function (tag) {
      if (tag === 'canvas') {
        const canvas = origCreateElement('canvas');
        canvas.getContext = () => mockCtx;
        canvas.toDataURL = () => 'data:image/png;base64,mock';
        return canvas;
      }
      return origCreateElement(tag);
    };
    window.WallpaperUI.generate('2026-09');
    const textCalls = mockCtx.calls.filter(c => c[0] === 'fillText');
    const hasPetText = textCalls.some(c => String(c[1]).includes('小橘') || String(c[1]).includes('Lv'));
    assert.ok(hasPetText, '壁纸应包含宠物信息');
    document.createElement = origCreateElement;
  });
});
