/**
 * 阶段0测试：项目初始化
 * 验证项目结构、配置文件、HTML空壳、核心逻辑层
 */
const fs = require('fs');
const path = require('path');

describe('阶段0 - 项目初始化', function () {

  test('package.json 存在且包含 Capacitor 依赖', function () {
    const pkgPath = path.join(PROJECT_ROOT, 'package.json');
    assert.ok(fs.existsSync(pkgPath), 'package.json 不存在');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert.ok(pkg.dependencies['@capacitor/core'], '缺少 @capacitor/core 依赖');
    assert.ok(pkg.dependencies['@capacitor/app'], '缺少 @capacitor/app 依赖');
    assert.ok(pkg.devDependencies['@capacitor/cli'], '缺少 @capacitor/cli 依赖');
    assert.ok(pkg.scripts.test, '缺少 test 脚本');
  });

  test('capacitor.config.json 有效且配置正确', function () {
    const cfgPath = path.join(PROJECT_ROOT, 'capacitor.config.json');
    assert.ok(fs.existsSync(cfgPath), 'capacitor.config.json 不存在');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    assert.ok(cfg.appId, '缺少 appId');
    assert.ok(cfg.appName, '缺少 appName');
    assert.strictEqual(cfg.webDir, 'www', 'webDir 应为 www');
    assert.strictEqual(cfg.appName, '记账小猫', '应用名应为 记账小猫');
  });

  test('www/index.html 存在且包含基本结构', function () {
    const htmlPath = path.join(PROJECT_ROOT, 'www', 'index.html');
    assert.ok(fs.existsSync(htmlPath), 'www/index.html 不存在');
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(html.includes('<!DOCTYPE html>'), '缺少 DOCTYPE');
    assert.ok(html.includes('lang="zh-CN"'), '缺少中文语言声明');
    assert.ok(html.includes('viewport'), '缺少 viewport meta');
    // 5个页面
    assert.ok(html.includes('id="page-chat"'), '缺少记账页面');
    assert.ok(html.includes('id="page-overview"'), '缺少概览页面');
    assert.ok(html.includes('id="page-bills"'), '缺少账单页面');
    assert.ok(html.includes('id="page-pet"'), '缺少宠物页面');
    assert.ok(html.includes('id="page-me"'), '缺少我的页面');
    // 底部导航
    assert.ok(html.includes('bottom-nav'), '缺少底部导航');
    assert.ok((html.match(/nav-item/g) || []).length >= 5, '底部导航应至少5个项');
    // core.js（外部引用或已内联）
    assert.ok(html.includes('src="core.js"') || html.includes('accounting_app_data'), '缺少 core.js（外部引用或内联）');
    // CSS变量
    assert.ok(html.includes('--bg-cream'), '缺少 --bg-cream 变量');
    assert.ok(html.includes('--primary'), '缺少 --primary 变量');
  });

  test('www/core.js 可在 Node 中加载且 App 对象正确', function () {
    const App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));
    assert.ok(App, 'App 对象为空');
    assert.strictEqual(App.version, '1.0.0', '版本号应为 1.0.0');
    assert.strictEqual(App.storageKey, 'accounting_app_data', 'storageKey 不正确');
    // 工具函数存在
    assert.ok(App.Utils, '缺少 Utils');
    assert.strictEqual(typeof App.Utils.generateId, 'function', '缺少 generateId');
    assert.strictEqual(typeof App.Utils.formatMoney, 'function', '缺少 formatMoney');
    assert.strictEqual(typeof App.Utils.formatDate, 'function', '缺少 formatDate');
    assert.strictEqual(typeof App.Utils.today, 'function', '缺少 today');
    // Storage存在
    assert.ok(App.Storage, '缺少 Storage');
    assert.strictEqual(typeof App.Storage.read, 'function', '缺少 Storage.read');
    assert.strictEqual(typeof App.Storage.write, 'function', '缺少 Storage.write');
    // 默认数据
    assert.strictEqual(typeof App.defaultData, 'function', '缺少 defaultData');
    const dd = App.defaultData();
    assert.strictEqual(dd.categories.length, 7, '默认分类应为7个');
    assert.strictEqual(dd.budget.monthlyAmount, 1200, '默认预算应为1200');
    assert.strictEqual(dd.pet.name, '小橘', '默认宠物名应为 小橘');
    assert.strictEqual(dd.pet.level, 1, '默认宠物等级应为1');
  });

  test('工具函数基本功能正确', function () {
    const App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));
    // formatMoney
    assert.strictEqual(App.Utils.formatMoney(25), '25', '25 应格式化为 25');
    assert.strictEqual(App.Utils.formatMoney(25.5), '25.5', '25.5 应格式化为 25.5');
    assert.strictEqual(App.Utils.formatMoney(0), '0', '0 应格式化为 0');
    // generateId 不重复
    const id1 = App.Utils.generateId();
    const id2 = App.Utils.generateId();
    assert.notStrictEqual(id1, id2, '生成的ID不应重复');
    assert.ok(id1.length > 5, 'ID长度应大于5');
    // formatDate
    const ts = new Date(2026, 8, 7, 12, 30).getTime(); // 2026-09-07 12:30
    assert.strictEqual(App.Utils.formatDate(ts), '2026-09-07', '日期格式化错误');
    assert.strictEqual(App.Utils.formatTime(ts), '12:30', '时间格式化错误');
    assert.strictEqual(App.Utils.getMonthKey(ts), '2026-09', '月份格式化错误');
  });

  test('Storage 内存模式读写正常', function () {
    const App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));
    App.Storage._setMock(null);
    assert.strictEqual(App.Storage.read(), null, '初始应为null');
    // 写入
    const testData = { records: [{ id: '1', amount: 25 }], test: true };
    assert.ok(App.Storage.write(testData), '写入应返回true');
    // 读取
    const read = App.Storage.read();
    assert.strictEqual(read.test, true, '读取字段错误');
    assert.strictEqual(read.records[0].amount, 25, '读取记录错误');
    // get/set
    App.Storage.set('newField', 'hello');
    assert.strictEqual(App.Storage.get('newField'), 'hello', 'get/set 错误');
    // 清空
    App.Storage.clear();
    assert.strictEqual(App.Storage.read(), null, '清空后应为null');
  });

  test('init 初始化默认数据正常', function () {
    const App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));
    App.Storage._setMock(null);
    const data = App.init();
    assert.ok(data, 'init 应返回数据');
    assert.strictEqual(data.categories.length, 7, '初始化应有7个分类');
    assert.strictEqual(data.records.length, 0, '初始化记录应为空');
    assert.strictEqual(data.budget.monthlyAmount, 1200, '初始化预算应为1200');
    // 再次init不覆盖
    App.Storage.set('records', [{ id: 'x', amount: 100 }]);
    const data2 = App.init();
    assert.strictEqual(data2.records.length, 1, '已有数据时init不应覆盖');
    // 清理
    App.Storage._setMock(null);
  });

  test('项目目录结构完整', function () {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'www')), '缺少 www 目录');
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'tests')), '缺少 tests 目录');
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'PRD.md')), '缺少 PRD.md');
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'DEVELOPMENT_PLAN.md')), '缺少 DEVELOPMENT_PLAN.md');
  });
});
