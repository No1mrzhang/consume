/**
 * 记账小猫 - 核心逻辑层
 * 纯函数，无DOM依赖，可在Node.js中测试
 * UMD模式：浏览器中挂到 window.App，Node中通过 module.exports 导出
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.App = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const App = {};
  App.version = '1.0.0';
  App.storageKey = 'accounting_app_data';

  // ===== 工具函数 =====
  App.Utils = {
    /** 生成唯一ID */
    generateId: function () {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    },

    /** 金额格式化：去掉无意义的.00 */
    formatMoney: function (n) {
      n = Number(n);
      if (isNaN(n)) return '0';
      if (Number.isInteger(n)) return n.toString();
      return n.toFixed(2).replace(/\.?0+$/, '');
    },

    /** 时间戳 -> YYYY-MM-DD */
    formatDate: function (ts) {
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    },

    /** 时间戳 -> HH:MM */
    formatTime: function (ts) {
      const d = new Date(ts);
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    },

    /** 时间戳 -> YYYY-MM */
    getMonthKey: function (ts) {
      const d = new Date(ts);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    },

    /** 获取今天日期 YYYY-MM-DD */
    today: function () {
      return App.Utils.formatDate(Date.now());
    },

    /** 获取本月 YYYY-MM */
    thisMonth: function () {
      return App.Utils.getMonthKey(Date.now());
    },

    /**
     * 解析日期文本 -> YYYY-MM-DD
     * 支持：今天/昨天/前天/大前天、5月1日、5/1、5.1、2025-05-01、2025年5月1日
     * @param {string} text - 输入文本
     * @returns {string|null} - YYYY-MM-DD 或 null（未指定日期）
     */
    parseDateText: function (text) {
      if (!text) return null;
      const now = new Date();

      // 相对日期（注意顺序：大前天必须在前天之前匹配）
      if (/大前天/.test(text)) {
        const d = new Date(now);
        d.setDate(d.getDate() - 3);
        return App.Utils.formatDate(d.getTime());
      }
      if (/今天|今日/.test(text)) {
        return App.Utils.formatDate(now.getTime());
      }
      if (/昨天|昨日/.test(text)) {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return App.Utils.formatDate(d.getTime());
      }
      if (/前天/.test(text)) {
        const d = new Date(now);
        d.setDate(d.getDate() - 2);
        return App.Utils.formatDate(d.getTime());
      }

      // 完整日期：2025-05-01 / 2025/05/01 / 2025.05.01
      let m = text.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
      if (m) {
        const y = parseInt(m[1]);
        const mo = parseInt(m[2]);
        const d = parseInt(m[3]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        }
      }

      // 中文完整日期：2025年5月1日
      m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})[日号]?/);
      if (m) {
        const y = parseInt(m[1]);
        const mo = parseInt(m[2]);
        const d = parseInt(m[3]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        }
      }

      // 月日：5月1日 / 5月1号
      m = text.match(/(\d{1,2})月(\d{1,2})[日号]?/);
      if (m) {
        const mo = parseInt(m[1]);
        const d = parseInt(m[2]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          return now.getFullYear() + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        }
      }

      // 简写：5/1 / 5.1（仅当不是金额格式时）
      m = text.match(/(?:^|\s)(\d{1,2})[\/.](\d{1,2})(?:\s|$)/);
      if (m) {
        const mo = parseInt(m[1]);
        const d = parseInt(m[2]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          return now.getFullYear() + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        }
      }

      return null;
    },

    /**
     * 解析时间文本 -> HH:MM
     * 支持：12:30、12点30分、12点半、下午3点、早上8点、晚上9点半、中午12点、凌晨2点
     * @param {string} text - 输入文本
     * @returns {string|null} - HH:MM 或 null（未指定时间）
     */
    parseTimeText: function (text) {
      if (!text) return null;

      // 标准格式：12:30 / 12：30
      let m = text.match(/(\d{1,2})[:：](\d{2})/);
      if (m) {
        const h = parseInt(m[1]);
        const mi = parseInt(m[2]);
        if (h >= 0 && h <= 23 && mi >= 0 && mi <= 59) {
          return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
        }
      }

      // 带时段：下午3点半 / 早上8点15分 / 晚上9点
      const periodMatch = text.match(/(凌晨|早上|上午|中午|下午|晚上|傍晚|夜晚)?(\d{1,2})点(半|(\d{1,2})分?)?/);
      if (periodMatch) {
        let h = parseInt(periodMatch[2]);
        const period = periodMatch[1] || '';
        let mi = 0;
        if (periodMatch[3] === '半') {
          mi = 30;
        } else if (periodMatch[4]) {
          mi = parseInt(periodMatch[4]);
        }

        // 时段调整
        if ((period === '下午' || period === '晚上' || period === '傍晚' || period === '夜晚') && h < 12) {
          h += 12;
        }
        if (period === '中午' && h < 12) {
          h = 12;
        }
        if (period === '凌晨' && h === 12) {
          h = 0;
        }

        if (h >= 0 && h <= 23 && mi >= 0 && mi <= 59) {
          return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
        }
      }

      return null;
    },

    /**
     * 将日期(YYYY-MM-DD)和时间(HH:MM)组合为时间戳
     * @param {string} dateStr - YYYY-MM-DD
     * @param {string} timeStr - HH:MM
     * @returns {number} - 时间戳
     */
    combineDateTime: function (dateStr, timeStr) {
      const [y, mo, d] = dateStr.split('-').map(Number);
      const [h, mi] = (timeStr || '00:00').split(':').map(Number);
      return new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
    },

    /** HTML转义 */
    escapeHtml: function (str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  // ===== Storage 封装 =====
  App.Storage = {
    _mockData: null, // Node测试时使用内存存储

    /** 读取全部数据 */
    read: function () {
      if (typeof localStorage === 'undefined') {
        return App.Storage._mockData ? JSON.parse(JSON.stringify(App.Storage._mockData)) : null;
      }
      try {
        const raw = localStorage.getItem(App.storageKey);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    /** 写入全部数据 */
    write: function (data) {
      if (typeof localStorage === 'undefined') {
        App.Storage._mockData = JSON.parse(JSON.stringify(data));
        return true;
      }
      try {
        localStorage.setItem(App.storageKey, JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    },

    /** 读取某个字段 */
    get: function (key) {
      const data = App.Storage.read();
      return data ? data[key] : null;
    },

    /** 更新某个字段 */
    set: function (key, value) {
      const data = App.Storage.read() || {};
      data[key] = value;
      return App.Storage.write(data);
    },

    /** 清空 */
    clear: function () {
      if (typeof localStorage === 'undefined') {
        App.Storage._mockData = null;
        return;
      }
      localStorage.removeItem(App.storageKey);
    },

    /** 测试用：设置内存数据 */
    _setMock: function (data) {
      App.Storage._mockData = data ? JSON.parse(JSON.stringify(data)) : null;
    }
  };

  // ===== 默认数据 =====
  App.defaultData = function () {
    const now = Date.now();
    return {
      version: '1.0',
      records: [],
      categories: [
        { id: 'cat_food', name: '餐饮', icon: '🍚', isDefault: true, sort: 1 },
        { id: 'cat_study', name: '学习用品', icon: '📚', isDefault: true, sort: 2 },
        { id: 'cat_life', name: '生活用品', icon: '🧴', isDefault: true, sort: 3 },
        { id: 'cat_transport', name: '交通', icon: '🚌', isDefault: true, sort: 4 },
        { id: 'cat_entertainment', name: '娱乐', icon: '🎮', isDefault: true, sort: 5 },
        { id: 'cat_shopping', name: '购物', icon: '🛍️', isDefault: true, sort: 6 },
        { id: 'cat_other', name: '其他', icon: '📦', isDefault: true, sort: 7 }
      ],
      budget: {
        monthlyAmount: 1200,
        reminderEnabled: true,
        notified: { 50: false, 80: false, 90: false, 100: false },
        notifyMonth: App.Utils.thisMonth()
      },
      pet: {
        name: '小橘',
        level: 1,
        exp: 0,
        totalExp: 0,
        lastInteract: now
      },
      badges: [],
      checkin: {
        continuousDays: 0,
        lastCheckinDate: null,
        totalDays: 0,
        checkinDates: []
      },
      challenges: [],
      piggyBank: {
        targetAmount: 0,
        currentAmount: 0,
        history: [],
        startDate: null,
        achieved: false,
        achievedAt: null
      },
      settings: {
        moodEnabled: true,
        budgetReminderEnabled: true,
        lastCategoryId: null
      }
    };
  };

  /** 初始化：无数据时写入默认数据 */
  App.init = function () {
    if (!App.Storage.read()) {
      App.Storage.write(App.defaultData());
    }
    return App.Storage.read();
  };

  // ===== 记录管理 =====
  App.Records = {
    /** 添加记录 */
    add: function (amount, categoryId, note, mood, timestamp, name) {
      timestamp = timestamp || Date.now();
      const cat = App.Categories.getById(categoryId);
      if (!cat) return null;
      const record = {
        id: App.Utils.generateId(),
        amount: Number(amount),
        categoryId: categoryId,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        name: name || cat.name,
        note: note || '',
        mood: mood || null,
        timestamp: timestamp,
        date: App.Utils.formatDate(timestamp),
        time: App.Utils.formatTime(timestamp)
      };
      const records = App.Storage.get('records') || [];
      records.push(record);
      App.Storage.set('records', records);
      return record;
    },

    /** 获取所有记录（按时间倒序） */
    getAll: function () {
      const records = App.Storage.get('records') || [];
      return records.sort((a, b) => b.timestamp - a.timestamp);
    },

    /** 获取某天的记录 */
    getByDate: function (date) {
      return App.Records.getAll().filter(r => r.date === date);
    },

    /** 获取某月的记录 */
    getByMonth: function (monthKey) {
      return App.Records.getAll().filter(r => r.date.startsWith(monthKey));
    },

    /** 获取某分类的记录 */
    getByCategory: function (categoryId) {
      return App.Records.getAll().filter(r => r.categoryId === categoryId);
    },

    /** 删除记录 */
    delete: function (id) {
      const records = App.Storage.get('records') || [];
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return false;
      records.splice(idx, 1);
      App.Storage.set('records', records);
      return true;
    },

    /** 更新记录 */
    update: function (id, updates) {
      const records = App.Storage.get('records') || [];
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return null;
      Object.assign(records[idx], updates);
      App.Storage.set('records', records);
      return records[idx];
    },

    /** 获取最近n条 */
    getRecent: function (n) {
      return App.Records.getAll().slice(0, n);
    }
  };

  // ===== 分类管理 =====
  App.Categories = {
    /** 分类别名映射 */
    aliases: {
      'cat_food': ['吃饭', '午餐', '晚餐', '早餐', '午饭', '晚饭', '早饭', '奶茶', '咖啡', '饮料', '喝水', '零食', '水果', '外卖', '聚餐', '饭'],
      'cat_study': ['学习', '书', '书本', '文具', '笔', '课程', '培训', '资料'],
      'cat_life': ['生活', '日用品', '纸巾', '洗漱', '洗衣', '清洁', '家居'],
      'cat_transport': ['交通', '打车', '公交', '地铁', '骑车', '共享单车', '加油', '停车', '车票', '机票', '高铁'],
      'cat_entertainment': ['娱乐', '电影', '游戏', '唱歌', 'KTV', '旅游', '演出', '展览', '玩'],
      'cat_shopping': ['购物', '衣服', '鞋', '包', '化妆品', '数码', '电器', '买'],
      'cat_other': ['其他', '别的', '杂项']
    },

    /** 获取所有分类（按sort排序） */
    getAll: function () {
      const cats = App.Storage.get('categories') || [];
      return cats.sort((a, b) => a.sort - b.sort);
    },

    /** 按ID获取 */
    getById: function (id) {
      const cats = App.Storage.get('categories') || [];
      return cats.find(c => c.id === id) || null;
    },

    /** 按名称获取 */
    getByName: function (name) {
      const cats = App.Storage.get('categories') || [];
      return cats.find(c => c.name === name) || null;
    },

    /** 新增分类 */
    add: function (name, icon) {
      if (!name || !name.trim()) return null;
      const cats = App.Storage.get('categories') || [];
      const cat = {
        id: 'cat_' + App.Utils.generateId(),
        name: name.trim(),
        icon: icon || '📦',
        isDefault: false,
        sort: cats.length + 1
      };
      cats.push(cat);
      App.Storage.set('categories', cats);
      return cat;
    },

    /** 更新分类 */
    update: function (id, name, icon) {
      const cats = App.Storage.get('categories') || [];
      const idx = cats.findIndex(c => c.id === id);
      if (idx === -1) return null;
      if (name) cats[idx].name = name.trim();
      if (icon) cats[idx].icon = icon;
      App.Storage.set('categories', cats);
      return cats[idx];
    },

    /** 删除分类（有记录时归为其他） */
    delete: function (id) {
      const cats = App.Storage.get('categories') || [];
      const cat = cats.find(c => c.id === id);
      if (!cat) return { success: false, reason: '分类不存在' };
      if (cat.isDefault) return { success: false, reason: '预设分类不可删除' };

      const otherCat = cats.find(c => c.id === 'cat_other');
      const records = App.Storage.get('records') || [];
      let movedCount = 0;
      records.forEach(r => {
        if (r.categoryId === id) {
          r.categoryId = otherCat.id;
          r.categoryName = otherCat.name;
          r.categoryIcon = otherCat.icon;
          movedCount++;
        }
      });
      if (movedCount > 0) App.Storage.set('records', records);

      const idx = cats.findIndex(c => c.id === id);
      cats.splice(idx, 1);
      App.Storage.set('categories', cats);
      return { success: true, movedCount: movedCount };
    },

    /** 从文本中匹配分类 */
    matchCategory: function (text) {
      const cats = App.Categories.getAll();
      // 先匹配分类名
      for (let i = 0; i < cats.length; i++) {
        if (text.includes(cats[i].name)) return cats[i];
      }
      // 再匹配别名
      for (let i = 0; i < cats.length; i++) {
        const aliases = App.Categories.aliases[cats[i].id] || [];
        for (let j = 0; j < aliases.length; j++) {
          if (text.includes(aliases[j])) return cats[i];
        }
      }
      return null;
    }
  };

  // ===== 预算计算 =====
  App.Budget = {
    /** 获取预算设置 */
    get: function () {
      return App.Storage.get('budget') || App.defaultData().budget;
    },

    /** 设置月度预算金额 */
    setAmount: function (amount) {
      const budget = App.Budget.get();
      budget.monthlyAmount = Number(amount);
      App.Storage.set('budget', budget);
      return budget;
    },

    /** 开关提醒 */
    setReminder: function (enabled) {
      const budget = App.Budget.get();
      budget.reminderEnabled = !!enabled;
      App.Storage.set('budget', budget);
      return budget;
    },

    /** 获取某月预算统计 */
    getStats: function (monthKey) {
      monthKey = monthKey || App.Utils.thisMonth();
      const budget = App.Budget.get();
      const records = App.Records.getByMonth(monthKey);
      const used = records.reduce((sum, r) => sum + r.amount, 0);
      const remaining = budget.monthlyAmount - used;
      const ratio = budget.monthlyAmount > 0 ? used / budget.monthlyAmount : 0;
      let level = 'safe';
      if (ratio >= 1) level = 'over';
      else if (ratio >= 0.9) level = 'danger';
      else if (ratio >= 0.8) level = 'warning';
      else if (ratio >= 0.5) level = 'half';
      return {
        monthlyAmount: budget.monthlyAmount,
        used: used,
        remaining: remaining,
        ratio: ratio,
        level: level,
        count: records.length
      };
    },

    /** 跨月重置提醒状态 */
    resetIfNewMonth: function () {
      const budget = App.Budget.get();
      const currentMonth = App.Utils.thisMonth();
      if (budget.notifyMonth !== currentMonth) {
        budget.notifyMonth = currentMonth;
        budget.notified = { 50: false, 80: false, 90: false, 100: false };
        App.Storage.set('budget', budget);
      }
      return budget;
    },

    /** 检查应触发的阈值（返回触发的阈值数组，考虑notified状态） */
    checkThreshold: function () {
      App.Budget.resetIfNewMonth();
      const budget = App.Budget.get();
      if (!budget.reminderEnabled) return [];
      const stats = App.Budget.getStats();
      const triggered = [];
      const thresholds = [
        { key: 50, ratio: 0.5, type: 'info' },
        { key: 80, ratio: 0.8, type: 'warning' },
        { key: 90, ratio: 0.9, type: 'danger' },
        { key: 100, ratio: 1.0, type: 'celebrate' }
      ];
      thresholds.forEach(t => {
        if (stats.ratio >= t.ratio && !budget.notified[t.key]) {
          triggered.push(t);
          budget.notified[t.key] = true;
        }
      });
      if (triggered.length > 0) App.Storage.set('budget', budget);
      // 超支（每次都触发）
      if (stats.ratio > 1) triggered.push({ key: 'over', ratio: 1.0, type: 'over' });
      // 90%以上每次都二次确认
      if (stats.ratio >= 0.9 && stats.ratio < 1) {
        const already = triggered.find(t => t.key === 90);
        if (!already) triggered.push({ key: 90, ratio: 0.9, type: 'danger', repeat: true });
      }
      return triggered;
    }
  };

  // ===== 统计计算 =====
  App.Stats = {
    /** 今日总开销 */
    getTodayTotal: function () {
      const records = App.Records.getByDate(App.Utils.today());
      return {
        total: records.reduce((sum, r) => sum + r.amount, 0),
        count: records.length
      };
    },

    /** 某月总开销 */
    getMonthTotal: function (monthKey) {
      monthKey = monthKey || App.Utils.thisMonth();
      const records = App.Records.getByMonth(monthKey);
      return {
        total: records.reduce((sum, r) => sum + r.amount, 0),
        count: records.length,
        avg: records.length > 0 ? records.reduce((sum, r) => sum + r.amount, 0) / records.length : 0
      };
    },

    /** 某月各分类统计 */
    getCategoryStats: function (monthKey) {
      monthKey = monthKey || App.Utils.thisMonth();
      const records = App.Records.getByMonth(monthKey);
      const map = {};
      records.forEach(r => {
        if (!map[r.categoryId]) {
          map[r.categoryId] = { categoryId: r.categoryId, name: r.categoryName, icon: r.categoryIcon, total: 0, count: 0 };
        }
        map[r.categoryId].total += r.amount;
        map[r.categoryId].count++;
      });
      const list = Object.values(map).sort((a, b) => b.total - a.total);
      const grandTotal = list.reduce((s, c) => s + c.total, 0);
      list.forEach(c => { c.percent = grandTotal > 0 ? (c.total / grandTotal * 100) : 0; });
      return list;
    },

    /** 近7天走势 */
    get7DayTrend: function () {
      const result = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = App.Utils.formatDate(d.getTime());
        const records = App.Records.getByDate(dateStr);
        result.push({
          date: dateStr,
          label: (d.getMonth() + 1) + '/' + d.getDate(),
          total: records.reduce((s, r) => s + r.amount, 0),
          count: records.length
        });
      }
      return result;
    },

    /** 近n个月趋势 */
    getMonthTrend: function (n) {
      n = n || 6;
      const result = [];
      const now = new Date();
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = App.Utils.getMonthKey(d.getTime());
        const stats = App.Stats.getMonthTotal(monthKey);
        result.push({
          month: monthKey,
          label: (d.getMonth() + 1) + '月',
          total: stats.total,
          count: stats.count
        });
      }
      return result;
    },

    /** 某月心情统计 */
    getMoodStats: function (monthKey) {
      monthKey = monthKey || App.Utils.thisMonth();
      const records = App.Records.getByMonth(monthKey);
      const moods = { happy: 0, normal: 0, sad: 0, impulse: 0 };
      const moodAmount = { happy: 0, normal: 0, sad: 0, impulse: 0 };
      records.forEach(r => {
        if (r.mood && moods[r.mood] !== undefined) {
          moods[r.mood]++;
          moodAmount[r.mood] += r.amount;
        }
      });
      return {
        counts: moods,
        amounts: moodAmount,
        impulseTotal: moodAmount.impulse,
        impulseCount: moods.impulse
      };
    },

    /** 按日期分组记录（用于账单列表） */
    groupByDate: function (records) {
      const map = {};
      records.forEach(r => {
        if (!map[r.date]) map[r.date] = [];
        map[r.date].push(r);
      });
      return Object.keys(map).sort((a, b) => b.localeCompare(a)).map(date => ({
        date: date,
        records: map[date].sort((a, b) => b.timestamp - a.timestamp),
        total: map[date].reduce((s, r) => s + r.amount, 0)
      }));
    }
  };

  // ===== 自然语言解析器 =====
  App.Parser = {
    /**
     * 解析输入文本
     * @param {string} text - 用户输入
     * @returns {object|null} - {categoryId, categoryName, categoryIcon, amount, date, time, timestamp} 或 null
     */
    parse: function (text) {
      if (!text || !text.trim()) return null;
      const input = text.trim();

      // 提取金额：优先匹配带"元/块/钱"的数字，避免匹配到时间/日期中的数字
      let amountMatch = input.match(/(-?\d+(?:\.\d+)?)\s*(?:元|块|钱)/);
      if (!amountMatch) {
        // 没有明确单位时，匹配所有数字，取最后一个（金额通常在句末）
        const allNums = input.match(/-?\d+(?:\.\d+)?/g);
        if (allNums && allNums.length > 0) {
          const lastNum = allNums[allNums.length - 1];
          amountMatch = [lastNum, lastNum];
        }
      }
      if (!amountMatch) return null;
      const amount = parseFloat(amountMatch[1]);
      if (isNaN(amount) || amount <= 0) return null;

      // 匹配分类
      const category = App.Categories.matchCategory(input);
      if (!category) return null;

      // 解析日期和时间
      const date = App.Utils.parseDateText(input) || App.Utils.today();
      const time = App.Utils.parseTimeText(input) || App.Utils.formatTime(Date.now());
      const timestamp = App.Utils.combineDateTime(date, time);

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        amount: amount,
        date: date,
        time: time,
        timestamp: timestamp
      };
    }
  };

  // ===== 宠物养成 =====
  App.Pet = {
    /** 等级配置 */
    LEVELS: [
      { level: 1, icon: '🥚', name: '猫蛋', expNeeded: 50 },
      { level: 2, icon: '🐱', name: '小奶猫', expNeeded: 150 },
      { level: 3, icon: '😺', name: '幼猫', expNeeded: 300 },
      { level: 4, icon: '😻', name: '成年猫', expNeeded: 600 },
      { level: 5, icon: '👑', name: '猫王', expNeeded: Infinity }
    ],

    /** 心情配置 */
    MOODS: [
      { maxRatio: 0.5, icon: '😺', name: '开心', desc: '状态很好，继续保持' },
      { maxRatio: 0.8, icon: '😐', name: '一般', desc: '还算正常，注意控制' },
      { maxRatio: 0.9, icon: '😰', name: '紧张', desc: '有点紧张了，少花点' },
      { maxRatio: 1.0, icon: '😱', name: '焦虑', desc: '快超支了，住手！' },
      { maxRatio: Infinity, icon: '😿', name: '难过', desc: '超支了，下个月加油' }
    ],

    /** 获取宠物数据 */
    get: function () {
      return App.Storage.get('pet') || { name: '小橘', level: 1, exp: 0, totalExp: 0, lastInteract: Date.now() };
    },

    /** 获取等级信息 */
    getLevelInfo: function (level) {
      return App.Pet.LEVELS[level - 1] || App.Pet.LEVELS[0];
    },

    /** 获取经验进度 {current, needed, percent} */
    getExpProgress: function () {
      const pet = App.Pet.get();
      const info = App.Pet.getLevelInfo(pet.level);
      const needed = info.expNeeded === Infinity ? 0 : info.expNeeded;
      const percent = needed > 0 ? Math.min(Math.round(pet.exp / needed * 100), 100) : 100;
      return { current: pet.exp, needed: needed, percent: percent, isMax: pet.level >= 5 };
    },

    /** 计算记账获得的经验 */
    calcExpGain: function (amount) {
      return 10 + Math.floor(Number(amount) / 10);
    },

    /**
     * 增加经验
     * @returns {object} {leveledUp, oldLevel, newLevel, gainedExp, newIcon, newName}
     */
    addExp: function (amount) {
      const pet = App.Pet.get();
      const oldLevel = pet.level;
      const gainedExp = App.Pet.calcExpGain(amount);
      pet.exp += gainedExp;
      pet.totalExp += gainedExp;

      let leveledUp = false;
      // 循环检测升级（可能连续升级）
      while (pet.level < 5) {
        const info = App.Pet.getLevelInfo(pet.level);
        if (info.expNeeded === Infinity) break;
        if (pet.exp >= info.expNeeded) {
          pet.exp -= info.expNeeded;
          pet.level++;
          leveledUp = true;
        } else {
          break;
        }
      }
      // 满级后经验不再增加
      if (pet.level >= 5) {
        pet.exp = 0;
      }

      App.Storage.set('pet', pet);
      const newInfo = App.Pet.getLevelInfo(pet.level);
      return {
        leveledUp: leveledUp,
        oldLevel: oldLevel,
        newLevel: pet.level,
        gainedExp: gainedExp,
        newIcon: newInfo.icon,
        newName: newInfo.name
      };
    },

    /** 获取当前心情（与预算联动） */
    getMood: function () {
      const stats = App.Budget.getStats();
      for (let i = 0; i < App.Pet.MOODS.length; i++) {
        if (stats.ratio < App.Pet.MOODS[i].maxRatio) {
          return App.Pet.MOODS[i];
        }
      }
      return App.Pet.MOODS[App.Pet.MOODS.length - 1];
    },

    /** 改名 */
    setName: function (name) {
      if (!name || !name.trim()) return false;
      const pet = App.Pet.get();
      pet.name = name.trim();
      App.Storage.set('pet', pet);
      return true;
    },

    /** 重置宠物 */
    reset: function () {
      const pet = App.Pet.get();
      pet.level = 1;
      pet.exp = 0;
      pet.totalExp = 0;
      App.Storage.set('pet', pet);
      return pet;
    },

    /** 互动（返回随机台词） */
    interact: function () {
      const pet = App.Pet.get();
      pet.lastInteract = Date.now();
      App.Storage.set('pet', pet);
      const lines = [
        '今天也要好好记账哦～',
        '摸摸头～',
        '喵？有什么事吗？',
        '我在等你记账呢！',
        '今天花了多少钱呀？',
        '有你在真好～',
        '小橘会一直陪着你的！',
        '记账使我快乐，也使你快乐～',
        '喵呜～',
        '记得控制预算哦！'
      ];
      return lines[Math.floor(Math.random() * lines.length)];
    }
  };

  // ===== 成就徽章 =====
  App.Badges = {
    /** 徽章定义（20个） */
    DEFINITIONS: [
      // 记账坚持类
      { id: 'first_record', name: '第一笔账', desc: '记录第一笔开销', icon: '📝', category: 'persistence' },
      { id: 'ten_records', name: '记账小能手', desc: '累计记录 10 笔', icon: '✍️', category: 'persistence' },
      { id: 'hundred_records', name: '百笔达人', desc: '累计记录 100 笔', icon: '💯', category: 'persistence' },
      { id: 'five_hundred_records', name: '五百笔神', desc: '累计记录 500 笔', icon: '🏆', category: 'persistence' },
      { id: 'thousand_records', name: '千笔传奇', desc: '累计记录 1000 笔', icon: '👑', category: 'persistence' },
      { id: 'streak_7', name: '坚持一周', desc: '连续记账 7 天', icon: '🔥', category: 'persistence' },
      { id: 'streak_30', name: '坚持一月', desc: '连续记账 30 天', icon: '💎', category: 'persistence' },
      { id: 'streak_100', name: '坚持百日', desc: '连续记账 100 天', icon: '✨', category: 'persistence' },
      // 预算管理类
      { id: 'month_safe', name: '月度达标', desc: '本月开销不超预算', icon: '✅', category: 'budget' },
      { id: 'three_month_safe', name: '季度达标', desc: '连续 3 个月不超支', icon: '🎯', category: 'budget' },
      { id: 'zero_overspend', name: '零超支月', desc: '本月零超支', icon: '🛡️', category: 'budget' },
      { id: 'perfect_budget', name: '精准达标', desc: '某月预算刚好用完 100%', icon: '🎯', category: 'budget' },
      // 分类达人类
      { id: 'all_categories', name: '分类达人', desc: '使用全部 7 个预设分类', icon: '📂', category: 'category' },
      { id: 'category_master', name: '专精一类', desc: '单个分类累计 50 笔', icon: '🎓', category: 'category' },
      // 趣味彩蛋类
      { id: 'night_owl', name: '夜猫子', desc: '在 23:00 后记过账', icon: '🦉', category: 'fun' },
      { id: 'early_bird', name: '早起的鸟儿', desc: '在 05:00 前记过账', icon: '🐦', category: 'fun' },
      { id: 'pet_max', name: '宠物满级', desc: '宠物升到满级 Lv.5', icon: '👑', category: 'fun' },
      { id: 'impulse_3', name: '冲动消费者', desc: '冲动消费累计 3 笔', icon: '😤', category: 'fun' },
      { id: 'big_spender', name: '大手笔', desc: '单笔消费 ≥ 500 元', icon: '💎', category: 'fun' },
      { id: 'five_a_day', name: '记账狂魔', desc: '单日记账 ≥ 5 笔', icon: '⚡', category: 'fun' }
    ],

    /** 获取所有徽章（含解锁状态） */
    getAll: function () {
      const stored = App.Storage.get('badges') || [];
      const unlockedMap = {};
      stored.forEach(b => { unlockedMap[b.id] = b; });
      return App.Badges.DEFINITIONS.map(def => {
        const s = unlockedMap[def.id];
        return {
          id: def.id,
          name: def.name,
          desc: def.desc,
          icon: def.icon,
          category: def.category,
          unlocked: s ? !!s.unlocked : false,
          unlockedAt: s ? s.unlockedAt : null
        };
      });
    },

    /** 获取已解锁数量 */
    getUnlockedCount: function () {
      return App.Badges.getAll().filter(b => b.unlocked).length;
    },

    /** 检查单个徽章条件 */
    _checkCondition: function (badgeId) {
      const records = App.Storage.get('records') || [];
      const checkin = App.Storage.get('checkin') || { continuousDays: 0 };
      const budget = App.Storage.get('budget') || { monthlyAmount: 1200 };
      const pet = App.Storage.get('pet') || { level: 1 };

      switch (badgeId) {
        case 'first_record': return records.length >= 1;
        case 'ten_records': return records.length >= 10;
        case 'hundred_records': return records.length >= 100;
        case 'five_hundred_records': return records.length >= 500;
        case 'thousand_records': return records.length >= 1000;
        case 'streak_7': return checkin.continuousDays >= 7;
        case 'streak_30': return checkin.continuousDays >= 30;
        case 'streak_100': return checkin.continuousDays >= 100;
        case 'month_safe':
        case 'zero_overspend': {
          const stats = App.Budget.getStats();
          return stats.ratio <= 1;
        }
        case 'three_month_safe': {
          // 检查最近3个月是否都不超支
          const now = new Date();
          for (let i = 0; i < 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = App.Utils.getMonthKey(d.getTime());
            const monthRecords = records.filter(r => r.date.startsWith(monthKey));
            const total = monthRecords.reduce((s, r) => s + r.amount, 0);
            if (total > budget.monthlyAmount) return false;
          }
          return true;
        }
        case 'perfect_budget': {
          // 检查是否有月份达到100%（通过notified记录或精确计算）
          const monthMap = {};
          records.forEach(r => {
            const m = r.date.substring(0, 7);
            monthMap[m] = (monthMap[m] || 0) + r.amount;
          });
          return Object.values(monthMap).some(total => Math.abs(total - budget.monthlyAmount) < 0.01);
        }
        case 'all_categories': {
          const defaultCatIds = ['cat_food', 'cat_study', 'cat_life', 'cat_transport', 'cat_entertainment', 'cat_shopping', 'cat_other'];
          const usedIds = new Set(records.map(r => r.categoryId));
          return defaultCatIds.every(id => usedIds.has(id));
        }
        case 'category_master': {
          const countMap = {};
          records.forEach(r => { countMap[r.categoryId] = (countMap[r.categoryId] || 0) + 1; });
          return Object.values(countMap).some(c => c >= 50);
        }
        case 'night_owl': return records.some(r => { const h = parseInt(r.time.split(':')[0]); return h >= 23; });
        case 'early_bird': return records.some(r => { const h = parseInt(r.time.split(':')[0]); return h < 5; });
        case 'pet_max': return pet.level >= 5;
        case 'impulse_3': return records.filter(r => r.mood === 'impulse').length >= 3;
        case 'big_spender': return records.some(r => r.amount >= 500);
        case 'five_a_day': {
          const dayMap = {};
          records.forEach(r => { dayMap[r.date] = (dayMap[r.date] || 0) + 1; });
          return Object.values(dayMap).some(c => c >= 5);
        }
        default: return false;
      }
    },

    /**
     * 检查所有未解锁徽章，返回新解锁的徽章列表
     * @returns {array} 新解锁的徽章列表
     */
    checkAll: function () {
      const allBadges = App.Badges.getAll();
      const stored = App.Storage.get('badges') || [];
      const storedMap = {};
      stored.forEach(b => { storedMap[b.id] = b; });

      const newlyUnlocked = [];
      allBadges.forEach(badge => {
        if (!badge.unlocked && App.Badges._checkCondition(badge.id)) {
          const record = { id: badge.id, unlocked: true, unlockedAt: Date.now() };
          if (storedMap[badge.id]) {
            storedMap[badge.id] = record;
          } else {
            stored.push(record);
          }
          newlyUnlocked.push({ ...badge, unlocked: true, unlockedAt: record.unlockedAt });
        }
      });

      if (newlyUnlocked.length > 0) {
        App.Storage.set('badges', stored);
      }
      return newlyUnlocked;
    }
  };

  // ===== 连续打卡 =====
  App.Checkin = {
    /** 获取打卡数据 */
    get: function () {
      return App.Storage.get('checkin') || { continuousDays: 0, lastCheckinDate: null, totalDays: 0, checkinDates: [] };
    },

    /**
     * 每日第一笔记账时调用
     * @returns {object} {checkedIn, continuousDays, isNewDay}
     */
    check: function () {
      const checkin = App.Checkin.get();
      const today = App.Utils.today();
      const currentMonth = App.Utils.thisMonth();

      // 今天已打卡
      if (checkin.lastCheckinDate === today) {
        return { checkedIn: false, continuousDays: checkin.continuousDays, isNewDay: false };
      }

      // 计算昨天
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = App.Utils.formatDate(yesterday.getTime());

      if (checkin.lastCheckinDate === yesterdayStr) {
        checkin.continuousDays++;
      } else {
        checkin.continuousDays = 1;
      }
      checkin.totalDays++;
      checkin.lastCheckinDate = today;

      // 跨月重置日历
      if (!checkin.checkinDates || checkin.checkinDates.length === 0 ||
          !checkin.checkinDates[0].startsWith(currentMonth)) {
        checkin.checkinDates = [today];
      } else {
        if (!checkin.checkinDates.includes(today)) {
          checkin.checkinDates.push(today);
        }
      }

      App.Storage.set('checkin', checkin);
      return { checkedIn: true, continuousDays: checkin.continuousDays, isNewDay: true };
    },

    /** 获取连续打卡信息（火焰颜色、称号） */
    getStreakInfo: function () {
      const checkin = App.Checkin.get();
      const days = checkin.continuousDays;
      if (days >= 100) return { days: days, icon: '✨', color: 'gold', title: '记账之神' };
      if (days >= 30) return { days: days, icon: '👑', color: 'purple', title: '记账达人' };
      if (days >= 7) return { days: days, icon: '💎', color: 'blue', title: '记账新手' };
      return { days: days, icon: '🔥', color: 'normal', title: '继续加油' };
    },

    /** 获取本月打卡日历（已打卡日期数组） */
    getMonthCalendar: function () {
      const checkin = App.Checkin.get();
      const currentMonth = App.Utils.thisMonth();
      if (!checkin.checkinDates) return [];
      return checkin.checkinDates.filter(d => d.startsWith(currentMonth));
    }
  };

  // ===== 省钱挑战 =====
  App.Challenges = {
    /** 预设挑战定义 */
    DEFINITIONS: [
      {
        id: 'no_milk_tea',
        name: '30天不喝奶茶',
        desc: '连续30天不喝奶茶，养成健康习惯',
        icon: '🧋',
        duration: 30,
        type: 'no_keyword',
        keyword: '奶茶',
        categoryId: 'cat_food'
      },
      {
        id: 'low_carbon',
        name: '一周低碳出行',
        desc: '连续7天不使用交通工具，步行或骑行',
        icon: '🚲',
        duration: 7,
        type: 'no_category',
        categoryId: 'cat_transport'
      },
      {
        id: 'no_shopping',
        name: '7天不购物',
        desc: '连续7天不购物，控制消费欲望',
        icon: '🛍️',
        duration: 7,
        type: 'no_category',
        categoryId: 'cat_shopping'
      },
      {
        id: 'food_budget',
        name: '30天餐饮≤600',
        desc: '30天内餐饮总开销不超过600元',
        icon: '🍱',
        duration: 30,
        type: 'category_budget',
        categoryId: 'cat_food',
        maxAmount: 600
      }
    ],

    /** 获取所有挑战（含状态） */
    getAll: function () {
      const stored = App.Storage.get('challenges') || [];
      const storedMap = {};
      stored.forEach(c => { storedMap[c.id] = c; });
      return App.Challenges.DEFINITIONS.map(def => {
        const s = storedMap[def.id];
        return {
          id: def.id,
          name: def.name,
          desc: def.desc,
          icon: def.icon,
          duration: def.duration,
          type: def.type,
          categoryId: def.categoryId,
          keyword: def.keyword,
          maxAmount: def.maxAmount,
          status: s ? s.status : 'not_joined',
          startDate: s ? s.startDate : null,
          endDate: s ? s.endDate : null
        };
      });
    },

    /** 加入挑战 */
    join: function (id) {
      const def = App.Challenges.DEFINITIONS.find(d => d.id === id);
      if (!def) return null;
      const stored = App.Storage.get('challenges') || [];
      const existing = stored.find(c => c.id === id);
      if (existing && existing.status === 'active') return existing;
      const challenge = {
        id: id,
        status: 'active',
        startDate: App.Utils.today(),
        endDate: null
      };
      if (existing) {
        existing.status = 'active';
        existing.startDate = challenge.startDate;
        existing.endDate = null;
      } else {
        stored.push(challenge);
      }
      App.Storage.set('challenges', stored);
      return challenge;
    },

    /** 获取挑战进度 */
    getProgress: function (id) {
      const all = App.Challenges.getAll();
      const challenge = all.find(c => c.id === id);
      if (!challenge || !challenge.startDate) return { daysPassed: 0, percent: 0, detail: '' };
      const records = App.Storage.get('records') || [];
      const start = new Date(challenge.startDate);
      const today = new Date();
      const daysPassed = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
      const percent = Math.min(Math.round(daysPassed / challenge.duration * 100), 100);

      let detail = '';
      if (challenge.type === 'no_keyword') {
        const violated = records.filter(r =>
          r.date >= challenge.startDate &&
          r.name && r.name.includes(challenge.keyword)
        ).length;
        detail = violated > 0 ? '已违反 ' + violated + ' 次' : '坚持中，未喝奶茶';
      } else if (challenge.type === 'no_category') {
        const count = records.filter(r =>
          r.date >= challenge.startDate && r.categoryId === challenge.categoryId
        ).length;
        detail = count > 0 ? '已违反 ' + count + ' 次' : '坚持中，0次相关消费';
      } else if (challenge.type === 'category_budget') {
        const total = records.filter(r =>
          r.date >= challenge.startDate && r.categoryId === challenge.categoryId
        ).reduce((s, r) => s + r.amount, 0);
        detail = '已花 ' + total.toFixed(1) + ' / ' + challenge.maxAmount + ' 元';
      }

      return { daysPassed: daysPassed, percent: percent, detail: detail };
    },

    /**
     * 检查所有进行中挑战的状态
     * @returns {array} 状态变化的挑战列表
     */
    checkAll: function () {
      const all = App.Challenges.getAll();
      const stored = App.Storage.get('challenges') || [];
      const storedMap = {};
      stored.forEach(c => { storedMap[c.id] = c; });
      const records = App.Storage.get('records') || [];
      const changed = [];

      all.forEach(challenge => {
        if (challenge.status !== 'active' || !challenge.startDate) return;
        const start = new Date(challenge.startDate);
        const today = new Date();
        const daysPassed = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
        const periodRecords = records.filter(r => r.date >= challenge.startDate);

        let newStatus = null;
        let violated = false;

        if (challenge.type === 'no_keyword') {
          violated = periodRecords.some(r => r.name && r.name.includes(challenge.keyword));
        } else if (challenge.type === 'no_category') {
          violated = periodRecords.some(r => r.categoryId === challenge.categoryId);
        } else if (challenge.type === 'category_budget') {
          const total = periodRecords.filter(r => r.categoryId === challenge.categoryId)
            .reduce((s, r) => s + r.amount, 0);
          violated = total > challenge.maxAmount;
        }

        if (violated) {
          newStatus = 'failed';
        } else if (daysPassed >= challenge.duration) {
          newStatus = 'completed';
        }

        if (newStatus) {
          const s = storedMap[challenge.id];
          if (s) {
            s.status = newStatus;
            s.endDate = App.Utils.today();
          }
          changed.push({ ...challenge, status: newStatus, endDate: App.Utils.today() });
        }
      });

      if (changed.length > 0) {
        App.Storage.set('challenges', stored);
      }
      return changed;
    }
  };

  // ===== 存钱罐 =====
  App.PiggyBank = {
    /** 获取存钱罐数据 */
    get: function () {
      return App.Storage.get('piggyBank') || { targetAmount: 0, currentAmount: 0, history: [] };
    },

    /** 设置目标金额 */
    setTarget: function (amount) {
      amount = Number(amount);
      if (!amount || amount <= 0) return false;
      const piggy = App.PiggyBank.get();
      piggy.targetAmount = amount;
      App.Storage.set('piggyBank', piggy);
      return true;
    },

    /** 存入 */
    deposit: function (amount, note) {
      amount = Number(amount);
      if (!amount || amount <= 0) return false;
      const piggy = App.PiggyBank.get();
      piggy.currentAmount += amount;
      piggy.history.push({
        id: App.Utils.generateId(),
        amount: amount,
        type: 'deposit',
        note: note || '',
        date: App.Utils.today(),
        timestamp: Date.now()
      });
      App.Storage.set('piggyBank', piggy);
      return piggy;
    },

    /** 取出 */
    withdraw: function (amount, note) {
      amount = Number(amount);
      if (!amount || amount <= 0) return false;
      const piggy = App.PiggyBank.get();
      if (amount > piggy.currentAmount) return false;
      piggy.currentAmount -= amount;
      piggy.history.push({
        id: App.Utils.generateId(),
        amount: amount,
        type: 'withdraw',
        note: note || '',
        date: App.Utils.today(),
        timestamp: Date.now()
      });
      App.Storage.set('piggyBank', piggy);
      return piggy;
    },

    /** 获取进度 */
    getProgress: function () {
      const piggy = App.PiggyBank.get();
      const percent = piggy.targetAmount > 0
        ? Math.min(Math.round(piggy.currentAmount / piggy.targetAmount * 100), 100)
        : 0;
      return { current: piggy.currentAmount, target: piggy.targetAmount, percent: percent };
    },

    /** 重置 */
    reset: function () {
      App.Storage.set('piggyBank', { targetAmount: 0, currentAmount: 0, history: [] });
      return true;
    }
  };

  // ===== 日历模块 =====
  App.Calendar = {
    /**
     * 获取某月的日历数据
     * @param {number} year - 年
     * @param {number} month - 月（1-12）
     * @returns {object} {weeks: [[{date, day, amount, count, isToday, hasRecords}]], monthTotal, monthKey}
     */
    getMonthCalendar: function (year, month) {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      const startWeekday = firstDay.getDay(); // 0=周日
      const daysInMonth = lastDay.getDate();
      const todayStr = App.Utils.today();
      const monthKey = year + '-' + String(month).padStart(2, '0');

      // 获取当月所有记录
      const monthRecords = App.Records.getByMonth(monthKey);

      // 按日期分组计算消费
      const dayMap = {};
      monthRecords.forEach(r => {
        if (!dayMap[r.date]) {
          dayMap[r.date] = { amount: 0, count: 0 };
        }
        dayMap[r.date].amount += Number(r.amount);
        dayMap[r.date].count += 1;
      });

      // 构建日历周
      const weeks = [];
      let currentWeek = [];

      // 填充月初空白
      for (let i = 0; i < startWeekday; i++) {
        currentWeek.push(null);
      }

      // 填充日期
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        const dayData = dayMap[dateStr] || { amount: 0, count: 0 };
        currentWeek.push({
          date: dateStr,
          day: day,
          amount: dayData.amount,
          count: dayData.count,
          isToday: dateStr === todayStr,
          hasRecords: dayData.count > 0
        });

        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }

      // 填充月末空白
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        weeks.push(currentWeek);
      }

      // 计算月总消费
      const monthTotal = monthRecords.reduce((sum, r) => sum + Number(r.amount), 0);

      return {
        year: year,
        month: month,
        monthKey: monthKey,
        weeks: weeks,
        monthTotal: monthTotal,
        recordCount: monthRecords.length
      };
    },

    /**
     * 获取某天的所有记录
     * @param {string} date - YYYY-MM-DD
     * @returns {object} {records, total, count}
     */
    getDayDetail: function (date) {
      const records = App.Records.getByDate(date);
      const total = records.reduce((sum, r) => sum + Number(r.amount), 0);
      return {
        date: date,
        records: records,
        total: total,
        count: records.length
      };
    },

    /**
     * 获取月消费对比（当月 vs 上月）
     * @param {number} year - 年
     * @param {number} month - 月（1-12）
     * @returns {object} {current: {total, count, avg}, previous: {total, count, avg}, diff, diffPercent, trend}
     */
    getMonthComparison: function (year, month) {
      // 当月
      const currentKey = year + '-' + String(month).padStart(2, '0');
      const currentRecords = App.Records.getByMonth(currentKey);
      const currentTotal = currentRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      const currentCount = currentRecords.length;
      const daysInCurrentMonth = new Date(year, month, 0).getDate();
      const currentAvg = currentCount > 0 ? currentTotal / currentCount : 0;

      // 上月
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear = year - 1;
      }
      const prevKey = prevYear + '-' + String(prevMonth).padStart(2, '0');
      const prevRecords = App.Records.getByMonth(prevKey);
      const prevTotal = prevRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      const prevCount = prevRecords.length;
      const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;

      // 对比
      const diff = currentTotal - prevTotal;
      const diffPercent = prevTotal > 0 ? Math.round(diff / prevTotal * 100) : 0;
      let trend = 'equal';
      if (diff > 0) trend = 'up';
      else if (diff < 0) trend = 'down';

      return {
        current: {
          monthKey: currentKey,
          total: currentTotal,
          count: currentCount,
          avgPerRecord: currentAvg,
          daysInMonth: daysInCurrentMonth
        },
        previous: {
          monthKey: prevKey,
          total: prevTotal,
          count: prevCount,
          avgPerRecord: prevAvg
        },
        diff: diff,
        diffPercent: diffPercent,
        trend: trend
      };
    },

    /**
     * 获取某月各分类消费统计（用于日历详情页）
     * @param {number} year
     * @param {number} month
     * @returns {Array} [{categoryId, categoryName, categoryIcon, total, count, percent}]
     */
    getMonthCategoryStats: function (year, month) {
      const monthKey = year + '-' + String(month).padStart(2, '0');
      const records = App.Records.getByMonth(monthKey);
      const total = records.reduce((sum, r) => sum + Number(r.amount), 0);

      const catMap = {};
      records.forEach(r => {
        if (!catMap[r.categoryId]) {
          catMap[r.categoryId] = {
            categoryId: r.categoryId,
            categoryName: r.categoryName,
            categoryIcon: r.categoryIcon,
            total: 0,
            count: 0
          };
        }
        catMap[r.categoryId].total += Number(r.amount);
        catMap[r.categoryId].count += 1;
      });

      return Object.values(catMap)
        .map(c => ({
          ...c,
          percent: total > 0 ? Math.round(c.total / total * 100) : 0
        }))
        .sort((a, b) => b.total - a.total);
    }
  };

  return App;
});
