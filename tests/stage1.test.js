/**
 * 阶段1测试：基础框架与数据层
 * 验证记录管理、分类管理、预算计算、统计计算、自然语言解析器
 */
const path = require('path');
const App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));

// 辅助：初始化干净的测试数据
function setup() {
  App.Storage._setMock(null);
  App.init();
}

describe('阶段1 - 记录管理', function () {

  test('添加记录成功并返回记录对象', function () {
    setup();
    const record = App.Records.add(25, 'cat_food', '午饭', null, new Date(2026, 8, 7, 12, 30).getTime());
    assert.ok(record, '应返回记录');
    assert.strictEqual(record.amount, 25, '金额应为25');
    assert.strictEqual(record.categoryId, 'cat_food', '分类ID应为cat_food');
    assert.strictEqual(record.categoryName, '餐饮', '分类名应为餐饮');
    assert.strictEqual(record.categoryIcon, '🍚', '分类图标应为🍚');
    assert.strictEqual(record.note, '午饭', '备注应为午饭');
    assert.strictEqual(record.date, '2026-09-07', '日期应为2026-09-07');
    assert.strictEqual(record.time, '12:30', '时间应为12:30');
    assert.ok(record.id, '应有ID');
  });

  test('添加不存在的分类返回null', function () {
    setup();
    const record = App.Records.add(25, 'cat_not_exist');
    assert.strictEqual(record, null, '不存在分类应返回null');
  });

  test('getAll返回所有记录并按时间倒序', function () {
    setup();
    App.Records.add(10, 'cat_food', '', null, new Date(2026, 8, 7, 10, 0).getTime());
    App.Records.add(20, 'cat_transport', '', null, new Date(2026, 8, 7, 14, 0).getTime());
    App.Records.add(30, 'cat_shopping', '', null, new Date(2026, 8, 7, 9, 0).getTime());
    const all = App.Records.getAll();
    assert.strictEqual(all.length, 3, '应有3条记录');
    assert.strictEqual(all[0].amount, 20, '最新记录应为14:00的20元');
    assert.strictEqual(all[2].amount, 30, '最早记录应为9:00的30元');
  });

  test('getByDate按日期筛选', function () {
    setup();
    App.Records.add(10, 'cat_food', '', null, new Date(2026, 8, 7, 10, 0).getTime());
    App.Records.add(20, 'cat_food', '', null, new Date(2026, 8, 8, 10, 0).getTime());
    const day7 = App.Records.getByDate('2026-09-07');
    assert.strictEqual(day7.length, 1, '9月7日应有1条');
    assert.strictEqual(day7[0].amount, 10, '金额应为10');
  });

  test('getByMonth按月份筛选', function () {
    setup();
    App.Records.add(10, 'cat_food', '', null, new Date(2026, 8, 7).getTime());
    App.Records.add(20, 'cat_food', '', null, new Date(2026, 9, 7).getTime());
    const sep = App.Records.getByMonth('2026-09');
    assert.strictEqual(sep.length, 1, '9月应有1条');
  });

  test('delete删除记录', function () {
    setup();
    const r = App.Records.add(10, 'cat_food');
    assert.strictEqual(App.Records.getAll().length, 1);
    const result = App.Records.delete(r.id);
    assert.strictEqual(result, true, '删除应返回true');
    assert.strictEqual(App.Records.getAll().length, 0, '删除后应为0条');
    assert.strictEqual(App.Records.delete('not_exist'), false, '删除不存在的应返回false');
  });

  test('update更新记录字段', function () {
    setup();
    const r = App.Records.add(10, 'cat_food', '原备注');
    const updated = App.Records.update(r.id, { note: '新备注', mood: 'happy', amount: 15 });
    assert.strictEqual(updated.note, '新备注', '备注应更新');
    assert.strictEqual(updated.mood, 'happy', '心情应更新');
    assert.strictEqual(updated.amount, 15, '金额应更新');
    assert.strictEqual(App.Records.update('not_exist', {}), null, '更新不存在的应返回null');
  });

  test('getRecent返回最近n条', function () {
    setup();
    for (let i = 0; i < 10; i++) {
      App.Records.add(i + 1, 'cat_food', '', null, Date.now() + i * 1000);
    }
    const recent = App.Records.getRecent(3);
    assert.strictEqual(recent.length, 3, '应返回3条');
    assert.strictEqual(recent[0].amount, 10, '最新的应为10元');
  });
});

describe('阶段1 - 分类管理', function () {

  test('getAll返回7个预设分类并按sort排序', function () {
    setup();
    const cats = App.Categories.getAll();
    assert.strictEqual(cats.length, 7, '应有7个分类');
    assert.strictEqual(cats[0].name, '餐饮', '第一个应为餐饮');
    assert.strictEqual(cats[6].name, '其他', '最后一个应为其他');
  });

  test('getById/getByName正确查找', function () {
    setup();
    assert.strictEqual(App.Categories.getById('cat_food').name, '餐饮');
    assert.strictEqual(App.Categories.getByName('交通').id, 'cat_transport');
    assert.strictEqual(App.Categories.getById('not_exist'), null);
    assert.strictEqual(App.Categories.getByName('不存在'), null);
  });

  test('add新增分类', function () {
    setup();
    const cat = App.Categories.add('医疗', '💊');
    assert.ok(cat.id, '应有ID');
    assert.strictEqual(cat.name, '医疗');
    assert.strictEqual(cat.icon, '💊');
    assert.strictEqual(cat.isDefault, false);
    assert.strictEqual(App.Categories.getAll().length, 8, '应有8个分类');
  });

  test('add空名称返回null', function () {
    setup();
    assert.strictEqual(App.Categories.add(''), null);
    assert.strictEqual(App.Categories.add('   '), null);
  });

  test('update更新分类名称和图标', function () {
    setup();
    const updated = App.Categories.update('cat_food', '吃喝', '🍜');
    assert.strictEqual(updated.name, '吃喝');
    assert.strictEqual(updated.icon, '🍜');
    assert.strictEqual(App.Categories.update('not_exist', 'x'), null);
  });

  test('delete预设分类被拒绝', function () {
    setup();
    const result = App.Categories.delete('cat_food');
    assert.strictEqual(result.success, false, '预设分类不应删除');
    assert.strictEqual(result.reason, '预设分类不可删除');
  });

  test('delete自定义分类且无记录直接删除', function () {
    setup();
    const cat = App.Categories.add('测试', '🧪');
    const result = App.Categories.delete(cat.id);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.movedCount, 0);
    assert.strictEqual(App.Categories.getAll().length, 7);
  });

  test('delete自定义分类且有记录时迁移到其他', function () {
    setup();
    const cat = App.Categories.add('测试分类', '🧪');
    App.Records.add(10, cat.id, '测试记录');
    App.Records.add(20, cat.id, '另一条');
    assert.strictEqual(App.Records.getByCategory(cat.id).length, 2);
    const result = App.Categories.delete(cat.id);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.movedCount, 2, '应迁移2条记录');
    const otherRecords = App.Records.getByCategory('cat_other');
    assert.strictEqual(otherRecords.length, 2, '其他分类应有2条');
    assert.strictEqual(otherRecords[0].categoryName, '其他', '迁移后分类名应为其他');
  });

  test('matchCategory匹配分类名', function () {
    setup();
    assert.strictEqual(App.Categories.matchCategory('吃饭 25元').name, '餐饮');
    assert.strictEqual(App.Categories.matchCategory('学习用品 38').name, '学习用品');
    assert.strictEqual(App.Categories.matchCategory('生活用品 12').name, '生活用品');
  });

  test('matchCategory匹配别名', function () {
    setup();
    assert.strictEqual(App.Categories.matchCategory('奶茶 15').name, '餐饮', '奶茶应匹配餐饮');
    assert.strictEqual(App.Categories.matchCategory('打车 20').name, '交通', '打车应匹配交通');
    assert.strictEqual(App.Categories.matchCategory('电影票 50').name, '娱乐', '电影应匹配娱乐');
    assert.strictEqual(App.Categories.matchCategory('买衣服 200').name, '购物', '买衣服应匹配购物');
  });

  test('matchCategory无匹配返回null', function () {
    setup();
    assert.strictEqual(App.Categories.matchCategory('今天天气好'), null);
  });
});

describe('阶段1 - 预算计算', function () {

  test('get返回默认预算1200', function () {
    setup();
    const budget = App.Budget.get();
    assert.strictEqual(budget.monthlyAmount, 1200);
    assert.strictEqual(budget.reminderEnabled, true);
  });

  test('setAmount修改预算金额', function () {
    setup();
    App.Budget.setAmount(2000);
    assert.strictEqual(App.Budget.get().monthlyAmount, 2000);
  });

  test('getStats正确计算已用/剩余/比例', function () {
    setup();
    App.Records.add(300, 'cat_food', '', null, new Date(2026, 8, 7).getTime());
    App.Records.add(200, 'cat_shopping', '', null, new Date(2026, 8, 8).getTime());
    const stats = App.Budget.getStats('2026-09');
    assert.strictEqual(stats.used, 500, '已用应为500');
    assert.strictEqual(stats.remaining, 700, '剩余应为700');
    assert.strictEqual(Math.round(stats.ratio * 100) / 100, 0.42, '比例约为0.42');
    assert.strictEqual(stats.level, 'safe', '低于50%应为safe');
    assert.strictEqual(stats.count, 2);
  });

  test('getStats各等级判断正确', function () {
    setup();
    // 50%
    App.Records.add(600, 'cat_food');
    assert.strictEqual(App.Budget.getStats().level, 'half');
    // 80%
    App.Records.add(360, 'cat_food');
    assert.strictEqual(App.Budget.getStats().level, 'warning');
    // 90%
    App.Records.add(120, 'cat_food');
    assert.strictEqual(App.Budget.getStats().level, 'danger');
    // 100%
    App.Records.add(120, 'cat_food');
    assert.strictEqual(App.Budget.getStats().level, 'over');
  });

  test('resetIfNewMonth跨月重置提醒状态', function () {
    setup();
    const budget = App.Budget.get();
    budget.notifyMonth = '2026-08';
    budget.notified = { 50: true, 80: true, 90: true, 100: true };
    App.Storage.set('budget', budget);
    const reset = App.Budget.resetIfNewMonth();
    assert.strictEqual(reset.notifyMonth, App.Utils.thisMonth(), '应更新为当前月');
    assert.strictEqual(reset.notified[50], false, '50%应重置为false');
    assert.strictEqual(reset.notified[80], false);
  });

  test('checkThreshold首次达到50%触发', function () {
    setup();
    App.Budget.resetIfNewMonth();
    App.Records.add(600, 'cat_food'); // 50%
    const triggered = App.Budget.checkThreshold();
    assert.ok(triggered.find(t => t.key === 50), '应触发50%');
    // 再次检查不应重复触发
    const triggered2 = App.Budget.checkThreshold();
    assert.strictEqual(triggered2.find(t => t.key === 50), undefined, '不应重复触发50%');
  });

  test('checkThreshold达到100%触发庆祝', function () {
    setup();
    App.Budget.resetIfNewMonth();
    App.Records.add(1200, 'cat_food'); // 100%
    const triggered = App.Budget.checkThreshold();
    assert.ok(triggered.find(t => t.key === 100), '应触发100%');
    assert.strictEqual(triggered.find(t => t.key === 100).type, 'celebrate');
  });

  test('checkThreshold超支每次触发', function () {
    setup();
    App.Budget.resetIfNewMonth();
    App.Records.add(1300, 'cat_food'); // 超支
    const triggered = App.Budget.checkThreshold();
    assert.ok(triggered.find(t => t.key === 'over'), '应触发超支');
    // 再次检查仍触发
    const triggered2 = App.Budget.checkThreshold();
    assert.ok(triggered2.find(t => t.key === 'over'), '超支应每次触发');
  });

  test('关闭提醒后checkThreshold返回空', function () {
    setup();
    App.Budget.setReminder(false);
    App.Records.add(600, 'cat_food');
    const triggered = App.Budget.checkThreshold();
    assert.strictEqual(triggered.length, 0, '关闭提醒应返回空');
  });
});

describe('阶段1 - 统计计算', function () {

  test('getTodayTotal返回今日总额和笔数', function () {
    setup();
    App.Records.add(25, 'cat_food');
    App.Records.add(15, 'cat_food');
    const result = App.Stats.getTodayTotal();
    assert.strictEqual(result.total, 40);
    assert.strictEqual(result.count, 2);
  });

  test('getMonthTotal返回月总额/笔数/均值', function () {
    setup();
    App.Records.add(100, 'cat_food', '', null, new Date(2026, 8, 7).getTime());
    App.Records.add(200, 'cat_shopping', '', null, new Date(2026, 8, 8).getTime());
    const result = App.Stats.getMonthTotal('2026-09');
    assert.strictEqual(result.total, 300);
    assert.strictEqual(result.count, 2);
    assert.strictEqual(result.avg, 150);
  });

  test('getCategoryStats返回分类统计并排序', function () {
    setup();
    App.Records.add(100, 'cat_food', '', null, new Date(2026, 8, 7).getTime());
    App.Records.add(50, 'cat_food', '', null, new Date(2026, 8, 8).getTime());
    App.Records.add(200, 'cat_shopping', '', null, new Date(2026, 8, 9).getTime());
    const stats = App.Stats.getCategoryStats('2026-09');
    assert.strictEqual(stats.length, 2, '应有2个分类');
    assert.strictEqual(stats[0].name, '购物', '购物应排第一（200元）');
    assert.strictEqual(stats[0].total, 200);
    assert.strictEqual(stats[1].total, 150);
    assert.strictEqual(Math.round(stats[0].percent), 57, '购物占比约57%');
  });

  test('get7DayTrend返回近7天数据', function () {
    setup();
    const trend = App.Stats.get7DayTrend();
    assert.strictEqual(trend.length, 7, '应有7天');
    assert.ok(trend[0].date < trend[6].date, '应按日期升序');
    assert.ok(trend[0].label, '应有label');
    // 添加今天的记录
    App.Records.add(50, 'cat_food');
    const trend2 = App.Stats.get7DayTrend();
    assert.strictEqual(trend2[6].total, 50, '今天应有50元');
  });

  test('getMonthTrend返回近n个月', function () {
    setup();
    const trend = App.Stats.getMonthTrend(6);
    assert.strictEqual(trend.length, 6, '应有6个月');
    assert.ok(trend[0].month < trend[5].month, '应按月份升序');
  });

  test('getMoodStats返回心情统计', function () {
    setup();
    App.Records.add(50, 'cat_food', '', 'happy', new Date(2026, 8, 7).getTime());
    App.Records.add(100, 'cat_shopping', '', 'impulse', new Date(2026, 8, 8).getTime());
    App.Records.add(30, 'cat_food', '', 'impulse', new Date(2026, 8, 9).getTime());
    const stats = App.Stats.getMoodStats('2026-09');
    assert.strictEqual(stats.counts.happy, 1);
    assert.strictEqual(stats.counts.impulse, 2);
    assert.strictEqual(stats.impulseTotal, 130, '冲动消费总额应为130');
    assert.strictEqual(stats.impulseCount, 2);
  });

  test('groupByDate按日期分组并计算小计', function () {
    setup();
    const records = [
      { id: '1', amount: 10, date: '2026-09-07', timestamp: 100 },
      { id: '2', amount: 20, date: '2026-09-07', timestamp: 200 },
      { id: '3', amount: 30, date: '2026-09-08', timestamp: 300 }
    ];
    const groups = App.Stats.groupByDate(records);
    assert.strictEqual(groups.length, 2, '应有2组');
    assert.strictEqual(groups[0].date, '2026-09-08', '最新日期排前');
    assert.strictEqual(groups[0].total, 30);
    assert.strictEqual(groups[1].total, 30, '9月7日小计30');
  });
});

describe('阶段1 - 自然语言解析器', function () {

  test('解析标准格式"分类 金额 元"', function () {
    setup();
    const r = App.Parser.parse('吃饭 25 元');
    assert.ok(r, '应解析成功');
    assert.strictEqual(r.categoryName, '餐饮');
    assert.strictEqual(r.amount, 25);
  });

  test('解析无"元"字格式', function () {
    setup();
    const r = App.Parser.parse('奶茶15');
    assert.ok(r);
    assert.strictEqual(r.categoryName, '餐饮');
    assert.strictEqual(r.amount, 15);
  });

  test('解析小数金额', function () {
    setup();
    const r = App.Parser.parse('打车 12.5 元');
    assert.ok(r);
    assert.strictEqual(r.amount, 12.5);
    assert.strictEqual(r.categoryName, '交通');
  });

  test('解析带¥符号', function () {
    setup();
    const r = App.Parser.parse('电影票 ¥50');
    assert.ok(r);
    assert.strictEqual(r.amount, 50);
    assert.strictEqual(r.categoryName, '娱乐');
  });

  test('解析学习用品/生活用品等预设分类', function () {
    setup();
    assert.strictEqual(App.Parser.parse('学习用品 38 元').categoryName, '学习用品');
    assert.strictEqual(App.Parser.parse('生活用品 12 元').categoryName, '生活用品');
    assert.strictEqual(App.Parser.parse('购物 200元').categoryName, '购物');
  });

  test('无金额返回null', function () {
    setup();
    assert.strictEqual(App.Parser.parse('吃饭'), null);
    assert.strictEqual(App.Parser.parse('今天花了好多'), null);
  });

  test('无分类返回null', function () {
    setup();
    assert.strictEqual(App.Parser.parse('25元'), null, '只有金额无分类应返回null');
    assert.strictEqual(App.Parser.parse('abc 25'), null, '无匹配分类应返回null');
  });

  test('空输入返回null', function () {
    setup();
    assert.strictEqual(App.Parser.parse(''), null);
    assert.strictEqual(App.Parser.parse('   '), null);
    assert.strictEqual(App.Parser.parse(null), null);
  });

  test('金额为0或负数返回null', function () {
    setup();
    assert.strictEqual(App.Parser.parse('吃饭 0元'), null);
    assert.strictEqual(App.Parser.parse('吃饭 -5元'), null);
  });

  test('金额在分类前面也能解析', function () {
    setup();
    const r = App.Parser.parse('25元 吃饭');
    assert.ok(r);
    assert.strictEqual(r.amount, 25);
    assert.strictEqual(r.categoryName, '餐饮');
  });
});
