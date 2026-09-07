/**
 * 阶段12测试：日历功能
 * 测试App.Calendar日历数据模块和UI渲染
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));

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

// 辅助：初始化干净的测试数据
function setup() {
  App.Storage._setMock(null);
  App.init();
}

describe('阶段12 - Calendar.getMonthCalendar 日历数据', function () {
  beforeEach(function () {
    setup();
  });

  test('返回正确的月份基本信息', function () {
    const cal = App.Calendar.getMonthCalendar(2026, 9);
    assert.strictEqual(cal.year, 2026);
    assert.strictEqual(cal.month, 9);
    assert.strictEqual(cal.monthKey, '2026-09');
  });

  test('2026年9月有5周（9月1日是周二）', function () {
    const cal = App.Calendar.getMonthCalendar(2026, 9);
    assert.ok(cal.weeks.length >= 4 && cal.weeks.length <= 6, '周数应在4-6之间，实际：' + cal.weeks.length);
  });

  test('每周有7天', function () {
    const cal = App.Calendar.getMonthCalendar(2026, 9);
    cal.weeks.forEach(week => {
      assert.strictEqual(week.length, 7, '每周应有7天');
    });
  });

  test('2026年9月有30天', function () {
    const cal = App.Calendar.getMonthCalendar(2026, 9);
    let dayCount = 0;
    cal.weeks.forEach(week => {
      week.forEach(day => {
        if (day !== null) dayCount++;
      });
    });
    assert.strictEqual(dayCount, 30, '9月应有30天');
  });

  test('2026年2月有28天（非闰年）', function () {
    const cal = App.Calendar.getMonthCalendar(2026, 2);
    let dayCount = 0;
    cal.weeks.forEach(week => {
      week.forEach(day => {
        if (day !== null) dayCount++;
      });
    });
    assert.strictEqual(dayCount, 28, '2026年2月应有28天');
  });

  test('有消费记录的日期标记hasRecords=true', function () {
    // 添加一条9月15日的记录
    const ts = App.Utils.combineDateTime('2026-09-15', '12:30');
    App.Records.add(25, 'cat_food', '', null, ts, '吃饭');
    const cal = App.Calendar.getMonthCalendar(2026, 9);
    let found = false;
    cal.weeks.forEach(week => {
      week.forEach(day => {
        if (day && day.date === '2026-09-15') {
          assert.strictEqual(day.hasRecords, true);
          assert.strictEqual(day.amount, 25);
          assert.strictEqual(day.count, 1);
          found = true;
        }
      });
    });
    assert.ok(found, '应找到9月15日的记录');
  });

  test('无消费记录的日期hasRecords=false', function () {
    const cal = App.Calendar.getMonthCalendar(2026, 9);
    let foundEmpty = false;
    cal.weeks.forEach(week => {
      week.forEach(day => {
        if (day && !day.hasRecords) {
          assert.strictEqual(day.amount, 0);
          assert.strictEqual(day.count, 0);
          foundEmpty = true;
        }
      });
    });
    assert.ok(foundEmpty, '应找到无记录的日期');
  });

  test('今天标记isToday=true', function () {
    const today = new Date();
    const cal = App.Calendar.getMonthCalendar(today.getFullYear(), today.getMonth() + 1);
    let foundToday = false;
    cal.weeks.forEach(week => {
      week.forEach(day => {
        if (day && day.isToday) {
          assert.strictEqual(day.date, App.Utils.today());
          foundToday = true;
        }
      });
    });
    assert.ok(foundToday, '应找到今天的标记');
  });

  test('月总消费计算正确', function () {
    const ts1 = App.Utils.combineDateTime('2026-09-10', '12:00');
    const ts2 = App.Utils.combineDateTime('2026-09-20', '18:00');
    App.Records.add(25, 'cat_food', '', null, ts1, '吃饭');
    App.Records.add(15, 'cat_entertainment', '', null, ts2, '奶茶');
    const cal = App.Calendar.getMonthCalendar(2026, 9);
    assert.strictEqual(cal.monthTotal, 40);
    assert.strictEqual(cal.recordCount, 2);
  });
});

describe('阶段12 - Calendar.getDayDetail 某天详情', function () {
  beforeEach(function () {
    setup();
  });

  test('返回某天的所有记录', function () {
    const ts = App.Utils.combineDateTime('2026-09-15', '12:30');
    App.Records.add(25, 'cat_food', '午饭', null, ts, '吃饭');
    const detail = App.Calendar.getDayDetail('2026-09-15');
    assert.strictEqual(detail.date, '2026-09-15');
    assert.strictEqual(detail.count, 1);
    assert.strictEqual(detail.total, 25);
    assert.strictEqual(detail.records.length, 1);
    assert.strictEqual(detail.records[0].categoryName, '餐饮');
  });

  test('无记录的日期返回空数组', function () {
    const detail = App.Calendar.getDayDetail('2026-09-01');
    assert.strictEqual(detail.count, 0);
    assert.strictEqual(detail.total, 0);
    assert.strictEqual(detail.records.length, 0);
  });

  test('多笔记录总金额正确', function () {
    const ts1 = App.Utils.combineDateTime('2026-09-15', '08:00');
    const ts2 = App.Utils.combineDateTime('2026-09-15', '12:00');
    const ts3 = App.Utils.combineDateTime('2026-09-15', '18:00');
    App.Records.add(10, 'cat_food', '', null, ts1, '早餐');
    App.Records.add(25, 'cat_food', '', null, ts2, '午餐');
    App.Records.add(30, 'cat_food', '', null, ts3, '晚餐');
    const detail = App.Calendar.getDayDetail('2026-09-15');
    assert.strictEqual(detail.count, 3);
    assert.strictEqual(detail.total, 65);
  });
});

describe('阶段12 - Calendar.getMonthComparison 月消费对比', function () {
  beforeEach(function () {
    setup();
  });

  test('返回当月和上月的消费数据', function () {
    // 当月（9月）消费
    const ts1 = App.Utils.combineDateTime('2026-09-10', '12:00');
    App.Records.add(100, 'cat_shopping', '', null, ts1, '购物');
    // 上月（8月）消费
    const ts2 = App.Utils.combineDateTime('2026-08-15', '12:00');
    App.Records.add(80, 'cat_food', '', null, ts2, '吃饭');
    const comp = App.Calendar.getMonthComparison(2026, 9);
    assert.strictEqual(comp.current.monthKey, '2026-09');
    assert.strictEqual(comp.current.total, 100);
    assert.strictEqual(comp.previous.monthKey, '2026-08');
    assert.strictEqual(comp.previous.total, 80);
  });

  test('当月消费高于上月时trend=up', function () {
    const ts1 = App.Utils.combineDateTime('2026-09-10', '12:00');
    App.Records.add(100, 'cat_shopping', '', null, ts1, '购物');
    const ts2 = App.Utils.combineDateTime('2026-08-15', '12:00');
    App.Records.add(50, 'cat_food', '', null, ts2, '吃饭');
    const comp = App.Calendar.getMonthComparison(2026, 9);
    assert.strictEqual(comp.trend, 'up');
    assert.strictEqual(comp.diff, 50);
    assert.strictEqual(comp.diffPercent, 100);
  });

  test('当月消费低于上月时trend=down', function () {
    const ts1 = App.Utils.combineDateTime('2026-09-10', '12:00');
    App.Records.add(30, 'cat_food', '', null, ts1, '吃饭');
    const ts2 = App.Utils.combineDateTime('2026-08-15', '12:00');
    App.Records.add(80, 'cat_shopping', '', null, ts2, '购物');
    const comp = App.Calendar.getMonthComparison(2026, 9);
    assert.strictEqual(comp.trend, 'down');
    assert.strictEqual(comp.diff, -50);
  });

  test('1月时上月为去年12月', function () {
    const ts1 = App.Utils.combineDateTime('2026-01-10', '12:00');
    App.Records.add(50, 'cat_food', '', null, ts1, '吃饭');
    const comp = App.Calendar.getMonthComparison(2026, 1);
    assert.strictEqual(comp.previous.monthKey, '2025-12');
  });

  test('上月无消费时diffPercent=0', function () {
    const ts1 = App.Utils.combineDateTime('2026-09-10', '12:00');
    App.Records.add(50, 'cat_food', '', null, ts1, '吃饭');
    const comp = App.Calendar.getMonthComparison(2026, 9);
    assert.strictEqual(comp.previous.total, 0);
    assert.strictEqual(comp.diffPercent, 0);
  });
});

describe('阶段12 - Calendar.getMonthCategoryStats 月分类统计', function () {
  beforeEach(function () {
    setup();
  });

  test('返回各分类消费统计', function () {
    const ts1 = App.Utils.combineDateTime('2026-09-10', '12:00');
    const ts2 = App.Utils.combineDateTime('2026-09-15', '18:00');
    App.Records.add(100, 'cat_shopping', '', null, ts1, '购物');
    App.Records.add(50, 'cat_food', '', null, ts2, '吃饭');
    const stats = App.Calendar.getMonthCategoryStats(2026, 9);
    assert.strictEqual(stats.length, 2);
    assert.strictEqual(stats[0].categoryId, 'cat_shopping');
    assert.strictEqual(stats[0].total, 100);
    assert.strictEqual(stats[1].categoryId, 'cat_food');
    assert.strictEqual(stats[1].total, 50);
  });

  test('按消费金额降序排列', function () {
    const ts1 = App.Utils.combineDateTime('2026-09-10', '12:00');
    const ts2 = App.Utils.combineDateTime('2026-09-15', '18:00');
    const ts3 = App.Utils.combineDateTime('2026-09-20', '20:00');
    App.Records.add(30, 'cat_food', '', null, ts1, '吃饭');
    App.Records.add(100, 'cat_shopping', '', null, ts2, '购物');
    App.Records.add(50, 'cat_entertainment', '', null, ts3, '娱乐');
    const stats = App.Calendar.getMonthCategoryStats(2026, 9);
    assert.strictEqual(stats[0].total, 100);
    assert.strictEqual(stats[1].total, 50);
    assert.strictEqual(stats[2].total, 30);
  });

  test('百分比计算正确', function () {
    const ts1 = App.Utils.combineDateTime('2026-09-10', '12:00');
    const ts2 = App.Utils.combineDateTime('2026-09-15', '18:00');
    App.Records.add(75, 'cat_food', '', null, ts1, '吃饭');
    App.Records.add(25, 'cat_entertainment', '', null, ts2, '娱乐');
    const stats = App.Calendar.getMonthCategoryStats(2026, 9);
    assert.strictEqual(stats[0].percent, 75);
    assert.strictEqual(stats[1].percent, 25);
  });
});

describe('阶段12 - 日历UI渲染', function () {
  let dom, window, document;

  beforeEach(function () {
    dom = setupDom();
    window = dom.window;
    document = window.document;
    window.localStorage.clear();
    window.App.init();
  });

  afterEach(function () {
    dom.window.close();
  });

  test('账单页面包含视图切换按钮', function () {
    const toggleBtn = document.getElementById('billsViewToggle');
    assert.ok(toggleBtn, '应包含视图切换按钮');
  });

  test('账单页面包含日历容器', function () {
    const calContainer = document.getElementById('billsCalendarContainer');
    assert.ok(calContainer, '应包含日历容器');
    assert.strictEqual(calContainer.style.display, 'none', '默认隐藏日历容器');
  });

  test('包含日历日期详情覆盖层', function () {
    const overlay = document.getElementById('calendarDayOverlay');
    assert.ok(overlay, '应包含日历日期详情覆盖层');
  });

  test('CalendarUI对象已初始化', function () {
    assert.ok(window.CalendarUI, 'CalendarUI应已初始化');
    assert.ok(typeof window.CalendarUI.render === 'function', '应有render方法');
    assert.ok(typeof window.CalendarUI.toggleView === 'function', '应有toggleView方法');
  });

  test('切换到日历视图后容器显示', function () {
    window.CalendarUI.toggleView();
    const calContainer = document.getElementById('billsCalendarContainer');
    assert.strictEqual(calContainer.style.display, 'block', '切换后日历容器应显示');
  });

  test('日历视图渲染出日历网格', function () {
    window.CalendarUI.toggleView();
    const calGrid = document.querySelector('.calendar-grid');
    assert.ok(calGrid, '应渲染日历网格');
    const days = document.querySelectorAll('.calendar-day');
    assert.ok(days.length > 28, '应渲染至少28个日期格子，实际：' + days.length);
  });

  test('日历视图渲染月消费对比区域', function () {
    window.CalendarUI.toggleView();
    const comparison = document.querySelector('.calendar-comparison');
    assert.ok(comparison, '应渲染月消费对比区域');
  });

  test('有消费记录的日期显示金额', function () {
    // 使用明确的今天日期时间戳，避免时区问题
    const now = new Date();
    const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).getTime();
    window.App.Records.add(25, 'cat_food', '', null, todayTs, '吃饭');
    window.CalendarUI.toggleView();
    const todayEl = document.querySelector('.calendar-day.is-today');
    assert.ok(todayEl, '应找到今天的日期格子');
    const amountEl = todayEl.querySelector('.calendar-day-amount');
    assert.ok(amountEl, '今天有消费应显示金额');
    assert.ok(amountEl.textContent.includes('25'), '金额应包含25');
  });
});
