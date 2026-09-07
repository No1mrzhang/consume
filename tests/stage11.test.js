/**
 * 阶段11测试：日期时间解析与自定义记录时间
 * 测试Utils.parseDateText、parseTimeText、combineDateTime、Parser.parse集成
 */
const path = require('path');
const App = require(path.join(PROJECT_ROOT, 'www', 'core.js'));

// 辅助：初始化干净的测试数据
function setup() {
  App.Storage._setMock(null);
  App.init();
}

// 获取基于当前日期的偏移日期
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return App.Utils.formatDate(d.getTime());
}

describe('阶段11 - 日期解析 Utils.parseDateText', function () {
  test('解析"今天"返回当天日期', function () {
    const result = App.Utils.parseDateText('今天吃饭25元');
    assert.strictEqual(result, dateOffset(0));
  });

  test('解析"昨天"返回昨天日期', function () {
    const result = App.Utils.parseDateText('昨天吃饭25元');
    assert.strictEqual(result, dateOffset(-1));
  });

  test('解析"前天"返回前天日期', function () {
    const result = App.Utils.parseDateText('前天吃饭25元');
    assert.strictEqual(result, dateOffset(-2));
  });

  test('解析"大前天"返回3天前日期', function () {
    const result = App.Utils.parseDateText('大前天吃饭25元');
    assert.strictEqual(result, dateOffset(-3));
  });

  test('解析"5月1日"返回今年5月1日', function () {
    const result = App.Utils.parseDateText('5月1日吃饭25元');
    const year = new Date().getFullYear();
    assert.strictEqual(result, year + '-05-01');
  });

  test('解析"12月25号"返回今年12月25日', function () {
    const result = App.Utils.parseDateText('12月25号购物100元');
    const year = new Date().getFullYear();
    assert.strictEqual(result, year + '-12-25');
  });

  test('解析"2025-05-01"返回指定日期', function () {
    const result = App.Utils.parseDateText('2025-05-01吃饭25元');
    assert.strictEqual(result, '2025-05-01');
  });

  test('解析"2025/05/01"返回指定日期', function () {
    const result = App.Utils.parseDateText('2025/05/01吃饭25元');
    assert.strictEqual(result, '2025-05-01');
  });

  test('解析"2025年5月1日"返回指定日期', function () {
    const result = App.Utils.parseDateText('2025年5月1日吃饭25元');
    assert.strictEqual(result, '2025-05-01');
  });

  test('无日期表达返回null', function () {
    const result = App.Utils.parseDateText('吃饭25元');
    assert.strictEqual(result, null);
  });

  test('无效月份返回null', function () {
    const result = App.Utils.parseDateText('13月1日吃饭25元');
    assert.strictEqual(result, null);
  });
});

describe('阶段11 - 时间解析 Utils.parseTimeText', function () {
  test('解析"12:30"标准格式', function () {
    const result = App.Utils.parseTimeText('12:30吃饭25元');
    assert.strictEqual(result, '12:30');
  });

  test('解析"9:05"单数小时', function () {
    const result = App.Utils.parseTimeText('9:05吃饭25元');
    assert.strictEqual(result, '09:05');
  });

  test('解析"12点30分"中文格式', function () {
    const result = App.Utils.parseTimeText('12点30分吃饭25元');
    assert.strictEqual(result, '12:30');
  });

  test('解析"12点半"半小时', function () {
    const result = App.Utils.parseTimeText('12点半吃饭25元');
    assert.strictEqual(result, '12:30');
  });

  test('解析"下午3点"转24小时制', function () {
    const result = App.Utils.parseTimeText('下午3点吃饭25元');
    assert.strictEqual(result, '15:00');
  });

  test('解析"晚上9点半"转24小时制', function () {
    const result = App.Utils.parseTimeText('晚上9点半吃饭25元');
    assert.strictEqual(result, '21:30');
  });

  test('解析"早上8点15分"', function () {
    const result = App.Utils.parseTimeText('早上8点15分吃饭25元');
    assert.strictEqual(result, '08:15');
  });

  test('解析"中午12点"', function () {
    const result = App.Utils.parseTimeText('中午12点吃饭25元');
    assert.strictEqual(result, '12:00');
  });

  test('解析"凌晨2点"', function () {
    const result = App.Utils.parseTimeText('凌晨2点吃饭25元');
    assert.strictEqual(result, '02:00');
  });

  test('无时间表达返回null', function () {
    const result = App.Utils.parseTimeText('吃饭25元');
    assert.strictEqual(result, null);
  });
});

describe('阶段11 - 日期时间组合 Utils.combineDateTime', function () {
  test('组合日期和时间为正确时间戳', function () {
    const ts = App.Utils.combineDateTime('2026-05-01', '12:30');
    const d = new Date(ts);
    assert.strictEqual(d.getFullYear(), 2026);
    assert.strictEqual(d.getMonth(), 4); // 5月
    assert.strictEqual(d.getDate(), 1);
    assert.strictEqual(d.getHours(), 12);
    assert.strictEqual(d.getMinutes(), 30);
  });

  test('仅日期时默认时间为00:00', function () {
    const ts = App.Utils.combineDateTime('2026-05-01', null);
    const d = new Date(ts);
    assert.strictEqual(d.getHours(), 0);
    assert.strictEqual(d.getMinutes(), 0);
  });
});

describe('阶段11 - Parser.parse集成日期时间', function () {
  beforeEach(function () {
    setup();
  });

  test('解析包含日期和时间的输入', function () {
    const result = App.Parser.parse('昨天下午3点吃饭25元');
    assert.ok(result, '应解析成功');
    assert.strictEqual(result.amount, 25);
    assert.strictEqual(result.date, dateOffset(-1));
    assert.strictEqual(result.time, '15:00');
    assert.ok(result.timestamp > 0, '应包含timestamp');
  });

  test('解析仅包含日期的输入，时间默认为当前', function () {
    const result = App.Parser.parse('前天奶茶15元');
    assert.ok(result);
    assert.strictEqual(result.date, dateOffset(-2));
    assert.ok(result.time.match(/^\d{2}:\d{2}$/), '时间格式应为HH:MM');
  });

  test('解析仅包含时间的输入，日期默认为今天', function () {
    const result = App.Parser.parse('早上8点学习用品38元');
    assert.ok(result);
    assert.strictEqual(result.date, dateOffset(0));
    assert.strictEqual(result.time, '08:00');
  });

  test('无日期时间的输入，使用当前日期和时间', function () {
    const result = App.Parser.parse('生活用品12元');
    assert.ok(result);
    assert.strictEqual(result.date, dateOffset(0));
    assert.ok(result.time.match(/^\d{2}:\d{2}$/));
  });

  test('解析完整日期"2025-05-01 12:30"', function () {
    const result = App.Parser.parse('2025-05-01 12:30娱乐50元');
    assert.ok(result);
    assert.strictEqual(result.date, '2025-05-01');
    assert.strictEqual(result.time, '12:30');
  });

  test('解析结果包含date/time/timestamp字段', function () {
    const result = App.Parser.parse('吃饭25元');
    assert.ok(result.date, '应包含date');
    assert.ok(result.time, '应包含time');
    assert.ok(result.timestamp > 0, '应包含timestamp');
  });
});

describe('阶段11 - Records.add使用自定义timestamp', function () {
  beforeEach(function () {
    setup();
  });

  test('使用自定义timestamp保存记录，date和time正确', function () {
    const customTs = App.Utils.combineDateTime('2026-05-01', '12:30');
    const record = App.Records.add(25, 'cat_food', '', null, customTs, '吃饭');
    assert.ok(record);
    assert.strictEqual(record.date, '2026-05-01');
    assert.strictEqual(record.time, '12:30');
    assert.strictEqual(record.timestamp, customTs);
  });

  test('不传timestamp时使用当前时间', function () {
    const before = Date.now();
    const record = App.Records.add(25, 'cat_food', '', null, null, '吃饭');
    const after = Date.now();
    assert.ok(record);
    assert.ok(record.timestamp >= before && record.timestamp <= after);
  });

  test('按日期查询能找到自定义日期的记录', function () {
    const customTs = App.Utils.combineDateTime('2026-05-01', '12:30');
    App.Records.add(25, 'cat_food', '', null, customTs, '吃饭');
    const mayRecords = App.Records.getByDate('2026-05-01');
    assert.strictEqual(mayRecords.length, 1);
    assert.strictEqual(mayRecords[0].amount, 25);
  });
});
