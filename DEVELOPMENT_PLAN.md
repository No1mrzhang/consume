# 个人开销记账 APP 开发计划

> 基于 PRD.md v1.0 制定  
> 日期：2026-09-07  
> 状态：待执行

---

## 一、总体概览

### 技术栈
- **Web 层**：单个 HTML 文件（内联 CSS + JS），无外部依赖、无 CDN、无框架
- **原生壳**：Capacitor 6（Web 技术打包为安卓 APK）
- **数据存储**：LocalStorage（WebView 本地存储）
- **图表**：纯 Canvas 手绘（不引入 Chart.js，保证离线单文件）
- **壁纸生成**：Canvas 绘制 + `toDataURL` 导出 PNG
- **动画**：CSS 动画 + JS 控制（撒花、气泡弹入、徽章解锁）

### 代码结构（单 HTML 内部分区）
```
index.html
├── <head>
│   ├── meta（viewport、theme-color、全屏配置）
│   └── <style> 内联 CSS
│       ├── CSS 变量（配色/圆角/阴影）
│       ├── 全局重置与基础样式
│       ├── 布局（容器/底部导航/页面切换）
│       ├── 各页面组件样式
│       └── 动画关键帧
└── <body>
    ├── APP 容器（max-width 520px）
    │   ├── 5 个页面容器（记账/概览/账单/宠物/我的）
    │   └── 底部导航栏
    ├── 全局弹窗容器（确认框/徽章解锁/撒花层）
    └── <script> 内联 JS
        ├── 工具函数区（日期/金额/解析/DOM操作）
        ├── 数据层（Storage 封装 + 数据模型 + 初始化）
        ├── 状态管理（全局 state + 事件通知）
        ├── 路由（Tab 切换 + 页面渲染）
        ├── 各模块逻辑（按 PRD 模块划分）
        └── 启动入口（初始化 + 事件绑定）
```

### 开发阶段总览
| 阶段 | 名称 | 核心产出 | 完成标志 |
|---|---|---|---|
| 0 | 项目初始化 | Capacitor 项目骨架 + HTML 空壳 | 项目可 `npx cap sync`，空页面可运行 |
| 1 | 基础框架与数据层 | CSS 变量/布局/导航 + Storage 封装 + 数据初始化 | 5 个 Tab 可切换，默认数据已写入 |
| 2 | 核心记账流程 | 聊天首页 + 自然语言解析 + 记账保存 | 输入"吃饭 25元"可正确保存并显示气泡 |
| 3 | 概览与账单 | 概览页全元素 + 3 张图表 + 账单列表/详情/删除 | 数据正确展示，删除后联动更新 |
| 4 | 分类与预算 | 分类增删改 + 预算设置 + 五级提醒 + 撒花动画 | 各阈值触发正确，100% 撒花 |
| 5 | 宠物养成 | 宠物展示 + 经验升级 + 心情联动 + 互动 | 记账后经验增加，升级形态变化 |
| 6 | 徽章与打卡 | 20 徽章 + 解锁检测 + 火焰打卡 + 日历 | 满足条件自动解锁，连续天数正确 |
| 7 | 挑战与存钱罐 | 4 个挑战 + 自动检测 + 存钱罐存入/进度 | 记奶茶后"不喝奶茶"挑战失败 |
| 8 | 心情与壁纸 | 心情标签 + 月度心情统计 + Canvas 壁纸生成 | 壁纸可预览并保存 PNG |
| 9 | 数据管理与设置 | 导出/导入/清空 + 设置页整合 + 关于页 | 导出再导入数据完全一致 |
| 10 | Capacitor 打包 | 图标/启动页/全屏配置 + sync + 构建 APK | APK 可安装并正常运行 |
| 11 | 测试与优化 | 全流程走查 + 验收标准逐项验证 + Bug 修复 | PRD 第 10 章验收标准全部通过 |

---

## 二、分阶段详细任务

### 阶段 0：项目初始化

**任务 0.1：创建项目目录结构**
- 操作：在 `C:\Users\jx95z\Desktop\app\记账app\` 下创建 `www/` 目录
- 预期产出：`www/` 目录存在
- 验证：`ls www` 无报错

**任务 0.2：初始化 package.json 并安装 Capacitor**
- 操作：
  ```bash
  cd "C:\Users\jx95z\Desktop\app\记账app"
  npm init -y
  npm install @capacitor/core @capacitor/cli
  npm install @capacitor/app @capacitor/filesystem
  ```
- 预期产出：`package.json`、`node_modules/`、Capacitor 已安装
- 验证：`npx cap --version` 输出版本号

**任务 0.3：创建 capacitor.config.json**
- 操作：写入配置
  ```json
  {
    "appId": "com.personal.accounting",
    "appName": "记账小猫",
    "webDir": "www",
    "server": { "androidScheme": "https" },
    "android": {
      "allowMixedContent": false,
      "captureInput": true
    }
  }
  ```
- 预期产出：`capacitor.config.json`
- 验证：JSON 格式正确

**任务 0.4：创建 www/index.html 空壳**
- 操作：写入基础 HTML 骨架（含 viewport meta、空 body、空 script）
- 预期产出：`www/index.html`，包含 APP 容器和底部导航占位
- 验证：浏览器打开显示空白页面无报错

**任务 0.5：添加 Android 平台**
- 操作：`npx cap add android`
- 预期产出：`android/` 目录，包含完整 Gradle 项目
- 验证：`android/app/build.gradle` 存在，`npx cap sync` 成功

**阶段 0 完成标志**：`npx cap sync` 成功，`npx cap open android` 可打开项目（Android Studio 装好后），空 HTML 页面可在 WebView 中加载。

---

### 阶段 1：基础框架与数据层

**任务 1.1：CSS 变量与全局样式**
- 操作：在 `<style>` 中定义
  - 配色变量：`--bg-cream #FFF8F0`、`--primary #FF8C42`、`--success #7BC8A4`、`--info #6BB6E8`、`--warning #FFD166`、`--danger #FF6B6B`、`--text #4A3F35`、`--text-light #9B8E82`、`--card #FFFFFF`
  - 圆角变量：`--radius-card 16px`、`--radius-bubble 20px`、`--radius-btn 12px`
  - 阴影变量：`--shadow-soft 0 2px 12px rgba(255,140,66,0.08)`
  - 全局重置：`* { margin:0; padding:0; box-sizing:border-box; }`
  - body 样式：奶油白背景、深棕灰文字、系统无衬线字体、`-webkit-tap-highlight-color: transparent`
- 预期产出：CSS 变量和全局样式生效
- 验证：页面背景为奶油白，文字为深棕灰

**任务 1.2：APP 容器与底部导航布局**
- 操作：
  - `.app-container`：`max-width: 520px; margin: 0 auto; min-height: 100vh; position: relative; padding-bottom: 70px;`
  - `.page`：默认 `display: none`，`.page.active` 显示
  - `.bottom-nav`：`position: fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:520px; height:60px; background:#fff; border-top:1px solid #F0E6D9; display:flex;`
  - 每个 nav-item：flex 1，列布局（图标+文字），选中态暖橘色
- 预期产出：5 个 Tab 可点击切换，底部导航固定
- 验证：点击不同 Tab，对应页面显示，导航项高亮切换

**任务 1.3：Storage 数据层封装**
- 操作：创建 `Storage` 对象
  ```javascript
  const Storage = {
    KEY: 'accounting_app_data',
    read() { /* 读取并 JSON.parse，失败返回 null */ },
    write(data) { /* JSON.stringify 后写入 */ },
    clear() { /* removeItem */ },
    get(key) { /* 读取全部后返回某字段 */ },
    set(key, value) { /* 读取全部后修改某字段再写回 */ }
  };
  ```
- 预期产出：Storage 对象可读写 LocalStorage
- 验证：`Storage.set('test', 123)` 后 `Storage.get('test')` 返回 123

**任务 1.4：数据模型与初始化**
- 操作：创建 `defaultData` 对象，包含 PRD 第 5 章所有数据结构
  - `categories`：7 个预设分类（带 id/name/icon/isDefault/sort）
  - `budget`：`{ monthlyAmount: 1200, reminderEnabled: true, notified: {50:false,80:false,90:false,100:false}, notifyMonth: 当前月 }`
  - `pet`：`{ name: '小橘', level: 1, exp: 0, totalExp: 0, lastInteract: Date.now() }`
  - `badges`：约 20 个徽章定义（全部 unlocked:false）
  - `checkin`：`{ continuousDays: 0, lastCheckinDate: null, totalDays: 0, checkinDates: [] }`
  - `challenges`：[]（用户加入后才有数据）+ `presetChallenges` 常量（4 个预设）
  - `piggyBank`：`{ targetAmount: 0, currentAmount: 0, startDate: null, achieved: false, achievedAt: null }`
  - `settings`：`{ moodEnabled: true, budgetReminderEnabled: true, lastCategoryId: null }`
  - `records`：[]
  - `version: '1.0'`
  - `init()`：Storage.read() 为 null 时写入 defaultData
- 预期产出：首次启动自动初始化默认数据
- 验证：清空 LocalStorage 后刷新，7 个分类和默认宠物已存在

**任务 1.5：工具函数库**
- 操作：创建 `Utils` 对象
  - `formatMoney(n)`：金额格式化，保留 2 位小数，去掉无意义的 .00
  - `formatDate(ts)`：时间戳 → YYYY-MM-DD
  - `formatTime(ts)`：时间戳 → HH:MM
  - `formatDateCN(ts)`：时间戳 → M月D日
  - `getMonthKey(ts)`：时间戳 → YYYY-MM
  - `daysInMonth(year, month)`：某月天数
  - `generateId()`：时间戳 + 随机数 → 唯一 ID
  - `parseInput(text)`：自然语言解析（见任务 2.2）
  - `$()` / `$$()`：DOM 查询简写
  - `escapeHtml(str)`：HTML 转义（防止 XSS）
- 预期产出：工具函数全部可用
- 验证：`Utils.formatMoney(25)` 返回 "25"，`Utils.formatMoney(25.5)` 返回 "25.5"

**阶段 1 完成标志**：5 个 Tab 可切换，默认数据已初始化，Storage 读写正常，工具函数可用。

---

### 阶段 2：核心记账流程（最高优先级）

**任务 2.1：聊天首页 UI**
- 操作：构建记账 Tab 页面
  - 顶部栏：`.chat-header`（宠物头像 emoji + 名字 + 心情 + 右侧今日已花）
  - 消息区：`.chat-messages`（可滚动，`flex:1; overflow-y:auto; padding:16px;`）
  - 快捷分类栏：`.quick-categories`（横向滚动，7 个分类标签按钮）
  - 输入区：`.chat-input-area`（输入框 + 发送按钮）
- 预期产出：聊天首页布局完整
- 验证：页面元素位置正确，快捷分类可横向滚动

**任务 2.2：自然语言解析器**
- 操作：实现 `Utils.parseInput(text)`
  - 去除首尾空格
  - 提取金额：正则匹配数字（支持小数）+ 可选的"元/块/¥/$"
  - 提取分类：遍历所有分类名称，匹配输入中包含的分类名（支持别名：吃饭/午餐/晚餐→餐饮，奶茶/饮料→餐饮或娱乐？按 PRD 奶茶属于餐饮）
  - 匹配优先级：精确匹配分类名 > 别名匹配
  - 返回 `{ categoryId, categoryName, categoryIcon, amount, rawText }` 或 `null`（识别失败）
- 预期产出：解析器可正确识别常见输入
- 验证：
  - `parseInput("吃饭 25元")` → 餐饮 + 25
  - `parseInput("学习用品38")` → 学习用品 + 38
  - `parseInput("奶茶15")` → 餐饮 + 15
  - `parseInput("今天天气好")` → null

**任务 2.3：记账逻辑与消息渲染**
- 操作：
  - 发送按钮点击/回车事件 → 获取输入框内容
  - 调用 `parseInput`：
    - 成功：创建 record 对象（id/amount/categoryId/categoryName/categoryIcon/timestamp/date/time），`Storage.set('records', [...records, record])`
    - 渲染右侧气泡（用户输入内容）
    - 渲染左侧气泡（"已记录：分类名 金额元，时间 HH:MM 🐱"）
    - 清空输入框，滚动到底部
    - 触发 `onRecordAdded(record)` 事件（后续阶段的宠物/预算/徽章/打卡/挑战都监听此事件）
    - 更新 `settings.lastCategoryId`
  - 失败：渲染左侧气泡（"没看懂哦，试试这样输入：吃饭 25 元 / 奶茶 15"）
- 预期产出：记账流程完整
- 验证：输入"吃饭 25元"，右侧气泡显示输入，左侧气泡显示确认，LocalStorage 中新增一条记录

**任务 2.4：快捷分类标签交互**
- 操作：
  - 渲染快捷分类栏（从 categories 数据读取）
  - 点击分类标签 → 在输入框填入分类名 + 空格，聚焦输入框
  - 上次使用的分类高亮（暖橘背景）
- 预期产出：快捷分类可用
- 验证：点击"餐饮"标签，输入框显示"餐饮 "并聚焦

**任务 2.5：消息气泡样式与动画**
- 操作：
  - `.bubble-right`：暖橘渐变 `linear-gradient(135deg, #FF8C42, #FFA968)`，白字，`border-radius: 20px 20px 4px 20px`，`align-self: flex-end`，`max-width: 75%`
  - `.bubble-left`：白底，`border: 1px solid #F0E6D9`，`border-radius: 20px 20px 20px 4px`，`align-self: flex-start`，`max-width: 75%`，左侧小猫头像
  - 消息添加动画：`@keyframes bubbleIn { from { opacity:0; transform: translateY(8px) scale(0.95); } to { opacity:1; transform:none; } }`
- 预期产出：气泡样式符合设计
- 验证：左右气泡视觉区分明显，新消息有弹入动画

**阶段 2 完成标志**：输入"吃饭 25元"可正确识别、保存、显示气泡；识别失败有提示；快捷分类可用；`onRecordAdded` 事件已定义并触发。

---

### 阶段 3：概览与账单

**任务 3.1：概览页顶部数据**
- 操作：
  - 今日总开销：筛选 `records` 中 `date === 今天`，金额求和，大字号显示
  - 今日记账笔数
  - 预算卡片：本月已花（当月 records 求和）、剩余（预算 - 已花）、进度条（已花/预算）
  - 进度条颜色：<50% 绿、50-80% 黄、80-90% 橙、90-100% 红、超支深红
- 预期产出：概览顶部数据正确
- 验证：记一笔后刷新概览，今日和本月金额对应增加

**任务 3.2：快捷记账与宠物小卡片**
- 操作：
  - 快捷记账区：6 个常用分类大按钮（按使用频率排序，取前 6），点击 → 切换到记账 Tab + 输入框填入分类名
  - 宠物小卡片：宠物 emoji + 等级 + 心情一句话，点击 → 切换到宠物 Tab
- 预期产出：快捷跳转可用
- 验证：点快捷按钮跳记账页且分类已填；点宠物卡跳宠物页

**任务 3.3：最近消费列表**
- 操作：取 records 按时间倒序前 5 条，每条显示分类 emoji + 分类名 + 金额 + 时间；点击 → 打开账单详情页（传入 recordId）
- 预期产出：最近 5 笔正确显示
- 验证：列表与实际最新记录一致

**任务 3.4：Canvas 图表 - 近 7 天走势**
- 操作：
  - 获取近 7 天日期，每天汇总金额
  - Canvas 绘制柱状图：X 轴 7 根柱（日期标签 M/D），Y 轴金额，柱体暖橘色圆角，柱顶显示金额
  - 画布尺寸：按容器宽度，`devicePixelRatio` 适配高清屏
- 预期产出：7 天柱状图正确
- 验证：有数据的日期柱高与金额成正比，无数据为 0

**任务 3.5：Canvas 图表 - 分类占比环形图**
- 操作：
  - 本月各分类金额汇总
  - Canvas 绘制环形图：每分类一个扇区，配色柔和，中心显示总金额
  - 图例：分类 emoji + 名称 + 金额 + 百分比
- 预期产出：环形图正确
- 验证：扇区角度与金额占比一致，图例总和等于本月总开销

**任务 3.6：Canvas 图表 - 月度趋势**
- 操作：
  - 近 6 个月每月金额汇总
  - Canvas 柱状图，X 轴月份标签（M月），Y 轴金额
  - 点击某月柱 → 在账单 Tab 切换到该月
- 预期产出：6 个月趋势图正确
- 验证：各月柱高与实际月开销一致

**任务 3.7：账单列表页**
- 操作：
  - 顶部：月份选择器（左/右箭头 + 当前月份 YYYY年MM月 + 当月总开销）+ 分类筛选按钮
  - 记录列表：按日期分组（倒序），每组头部显示日期 + 当日小计
  - 每条记录：分类 emoji + 分类名 + 金额（右对齐红色）+ 时间 + 心情标签（如有）+ 备注图标（如有）
  - 分类筛选：弹出分类选择，选中后只显示该分类记录
- 预期产出：账单列表完整
- 验证：切换月份数据对应变化，按日期分组正确，当日小计准确

**任务 3.8：账单详情页**
- 操作：
  - 独立页面（非 Tab，覆盖层或新页面），显示返回按钮
  - 大字号金额
  - 分类、发生时间（日期 + HH:MM）
  - 备注：可编辑文本框，失焦自动保存
  - 心情标签：4 个按钮（开心/一般/难过/冲动），点击切换保存
  - 删除按钮：红色，点击 → 二次确认弹窗 → 删除记录 → 返回账单列表
  - 删除后触发 `onRecordDeleted` 事件（更新概览/统计）
- 预期产出：详情页功能完整
- 验证：修改备注/心情后保存成功，删除后列表和统计同步更新

**阶段 3 完成标志**：概览页所有元素正确显示，3 张图表数据准确，账单列表可切换月份/筛选，详情页可编辑备注/心情/删除，数据联动正确。

---

### 阶段 4：分类管理与预算监控

**任务 4.1：分类管理页**
- 操作：
  - 分类列表：每行 emoji + 名称 + 编辑按钮 + 删除按钮（预设分类隐藏删除按钮）
  - 新增按钮：底部浮动按钮或顶部"新增分类"
  - 新增弹窗：输入名称 + 选择 emoji（提供常用 emoji 网格选择）
  - 编辑弹窗：修改名称 + 更换 emoji
  - 删除逻辑：检查该分类下是否有记录
    - 无记录：直接删除
    - 有记录：弹窗提示"该分类下有 N 条记录，删除后这些记录将归为'其他'分类，确认删除？"→ 确认后将所有该分类记录的 categoryId/categoryName/categoryIcon 改为"其他"分类，再删除分类
- 预期产出：分类增删改完整
- 验证：新增分类出现在列表和快捷标签；删除有记录的分类后记录归为"其他"

**任务 4.2：预算设置页**
- 操作：
  - 显示当前月度预算金额
  - 修改预算：数字输入框，保存后更新 `budget.monthlyAmount`
  - 预算提醒开关：toggle 按钮，控制 `budget.reminderEnabled`
  - 显示本月已用/剩余/比例
- 预期产出：预算可修改
- 验证：修改预算后概览页剩余金额和进度条对应变化

**任务 4.3：五级提醒逻辑**
- 操作：在 `onRecordAdded` 中调用 `checkBudgetThreshold(record)`
  - 计算本月已用比例 = 本月已花 / 月度预算
  - 检查 `budget.notifyMonth` 是否为当前月，不是则重置所有 notified 为 false 并更新 notifyMonth
  - 根据比例触发：
    - ≥50% 且 !notified[50]：渲染左侧气泡"已用一半，继续保持 👍"，标记 notified[50]=true
    - ≥80% 且 !notified[80]：弹出黄色预警弹窗"预算已用 80%，注意控制哦"，标记 notified[80]=true
    - ≥90%：每次记账弹出橙色警告 + 二次确认"预算已用 90%，确定要记这笔吗？"（确认才保存，取消则不保存）
    - ≥100% 且 !notified[100]：红色警报 + 全屏撒花动画 + "精准达标！本月预算刚好用完 🎉"，标记 notified[100]=true
    - >100%（超支）：宠物心情设为难过，渲染左侧气泡超支分析（超支金额、花销最多分类、控制建议）
  - 提醒开关关闭时，不弹弹窗，但宠物心情仍联动
- 预期产出：五级提醒正确触发
- 验证：通过修改记录金额模拟各阈值，确认每种提醒表现正确

**任务 4.4：全屏撒花动画**
- 操作：
  - 创建 `.confetti-container`（fixed 全屏，pointer-events:none，z-index:9999）
  - JS 生成 50~80 个彩色粒子（div，圆角，随机颜色/大小/初始位置/旋转）
  - CSS 动画：`@keyframes fall { from { transform: translateY(-10vh) rotate(0deg); opacity:1; } to { transform: translateY(110vh) rotate(720deg); opacity:0; } }`
  - 每个粒子随机延迟和持续时间（2~4秒）
  - 动画结束后移除粒子和容器
- 预期产出：撒花效果流畅
- 验证：预算 100% 时全屏彩色粒子飘落

**阶段 4 完成标志**：分类增删改正常，预算可修改，五级提醒各阈值触发正确，90% 二次确认可取消记账，100% 撒花动画正常，超支有分析建议。

---

### 阶段 5：宠物养成系统

**任务 5.1：宠物数据与等级配置**
- 操作：
  - 定义 `PET_LEVELS` 常量数组：
    ```javascript
    const PET_LEVELS = [
      { level: 1, icon: '🥚', name: '猫蛋', expNeeded: 50 },
      { level: 2, icon: '🐱', name: '小奶猫', expNeeded: 150 },
      { level: 3, icon: '😺', name: '幼猫', expNeeded: 300 },
      { level: 4, icon: '😻', name: '成年猫', expNeeded: 600 },
      { level: 5, icon: '👑', name: '猫王', expNeeded: Infinity }
    ];
    ```
  - 经验公式：`gainExp = 10 + Math.floor(amount / 10)`
  - `getPetMood()`：根据本月预算比例返回心情对象（emoji + 描述）
- 预期产出：宠物等级配置正确
- 验证：等级 1→2 需 50 经验，2→3 需 150，累计 200

**任务 5.2：宠物展示区 UI**
- 操作：在宠物 Tab 顶部构建
  - 大 emoji 形象（当前等级对应 icon，font-size 80px）
  - 名字 + 等级（Lv.X）+ 形态名
  - 经验进度条：当前经验 / 下一级所需，百分比显示
  - 心情 emoji + 一句话描述
  - 点击宠物区域 → 互动反馈
- 预期产出：宠物展示完整
- 验证：显示等级 1 猫蛋，经验 0/50，心情随预算变化

**任务 5.3：经验增加与升级检测**
- 操作：在 `onRecordAdded` 中调用 `addPetExp(record)`
  - 计算获得经验，累加到 `pet.exp` 和 `pet.totalExp`
  - 检查是否达到当前等级 expNeeded：
    - 达到且等级 <5：等级 +1，exp 减去上一级所需，弹出升级动画"恭喜！小橘升到 Lv.X，进化为 XX！"，宠物形象变化
    - 满级（等级 5）：exp 不再增加，显示"已满级"
  - 保存 pet 数据
- 预期产出：记账后经验增加，可升级
- 验证：连续记账累计 50 经验后，宠物从 🥚 升级为 🐱

**任务 5.4：宠物互动**
- 操作：
  - 点击宠物形象 → 随机从台词数组选一句，显示在气泡中（2秒后消失）
  - 宠物形象轻微弹跳动画（CSS `@keyframes bounce`）
  - 更新 `pet.lastInteract`
  - 台词数组：10~15 句可爱台词（"今天也要好好记账哦～"、"摸摸头～"、"喵？"等）
- 预期产出：点击宠物有反馈
- 验证：每次点击显示随机台词和弹跳动画

**任务 5.5：宠物设置**
- 操作：
  - 改名：输入框，保存更新 `pet.name`
  - 重置宠物：二次确认"确定要重置宠物吗？等级和经验将清零。"→ 确认后 pet 恢复初始值（等级 1，经验 0，名字保留或恢复默认）
- 预期产出：宠物可改名/重置
- 验证：改名后首页和宠物页名字更新；重置后等级恢复 1

**阶段 5 完成标志**：宠物形象随等级进化，记账获得经验，升级有动画通知，心情与预算联动，点击互动有台词，可改名和重置。

---

### 阶段 6：徽章与打卡

**任务 6.1：徽章数据定义**
- 操作：定义 `BADGES` 常量数组（约 20 个），每个包含 id/name/desc/icon/category/condition（函数或描述）
  - 记账坚持类（8个）：首笔记账、连续7天、连续30天、连续100天、累计100笔、累计500笔、累计1000笔、单日≥5笔
  - 预算管理类（4个）：月度达标（不超支）、连续3月达标、零超支月、精准100%达标
  - 分类达人类（2个）：用齐7分类、单分类累计50笔
  - 趣味彩蛋类（4个）：深夜记账（23:00后）、凌晨记账（05:00前）、宠物满级、冲动消费≥3次
- 预期产出：徽章定义完整
- 验证：徽章数量 ≥20，4 类都有

**任务 6.2：徽章墙 UI**
- 操作：
  - 按分类分组展示，每组标题（记账坚持/预算管理/分类达人/趣味彩蛋）
  - 已解锁徽章：彩色 emoji + 名称
  - 未解锁徽章：灰色滤镜 + 名称 + 锁图标
  - 点击徽章 → 详情弹窗（名称、描述、解锁条件、解锁时间或"未解锁"）
- 预期产出：徽章墙展示正确
- 验证：所有徽章显示，已解锁/未解锁视觉区分

**任务 6.3：徽章解锁检测**
- 操作：创建 `checkBadges()` 函数，在 `onRecordAdded` 和关键操作后调用
  - 遍历所有未解锁徽章，检查条件是否满足
  - 满足则标记 unlocked=true，记录 unlockedAt=Date.now()
  - 弹出徽章解锁动画（全屏居中，徽章 emoji 放大 + 光芒 + "解锁徽章：XX"，2秒后消失）
  - 一次可能解锁多个，依次弹出（间隔 2.5 秒）
- 预期产出：满足条件自动解锁
- 验证：首笔记账后解锁"首笔记账"徽章；连续7天后解锁对应徽章

**任务 6.4：打卡逻辑**
- 操作：在 `onRecordAdded` 中调用 `checkCheckin()`
  - 获取今天日期 `today`
  - 如果 `checkin.lastCheckinDate === today`：今天已打卡，不重复处理
  - 否则：
    - 获取昨天日期 `yesterday`
    - 如果 `checkin.lastCheckinDate === yesterday`：`continuousDays += 1`
    - 否则：`continuousDays = 1`（断签重置）
    - `totalDays += 1`
    - `lastCheckinDate = today`
    - 将 today 加入 `checkinDates`（如果是本月）
    - 跨月时重置 `checkinDates` 为 [today]
- 预期产出：连续天数计算正确
- 验证：连续两天记账，continuousDays=2；隔一天再记，continuousDays=1

**任务 6.5：打卡展示 UI**
- 操作：
  - 火焰图标 + 连续天数（大字号）
  - 火焰颜色和称号：
    - 1~6 天：🔥 普通，无称号
    - 7~29 天：💎 蓝色，"记账新手"
    - 30~99 天：👑 紫色，"记账达人"
    - 100+ 天：✨ 金色，"记账之神"
  - 本月打卡日历：7 列网格（日一二三四五六），已记账日期标圆点，今天高亮
- 预期产出：打卡展示完整
- 验证：连续 7 天火焰变蓝，日历标记正确

**阶段 6 完成标志**：约 20 个徽章定义完整，徽章墙分类展示，满足条件自动解锁并有动画，连续打卡天数计算正确（断签重置），火焰 7/30/100 天变色+称号，本月日历正确标记。

---

### 阶段 7：省钱挑战与存钱罐

**任务 7.1：预设挑战数据**
- 操作：定义 `PRESET_CHALLENGES` 常量数组
  ```javascript
  [
    { id: 'no_milk_tea_30', name: '30天不喝奶茶', desc: '30天内不记录奶茶/饮料类消费', type: 'no_category', targetCategory: '餐饮', keyword: '奶茶|饮料|咖啡', duration: 30, rewardExp: 100 },
    { id: 'low_carbon_7', name: '一周低碳出行', desc: '7天内交通类消费不超过2笔', type: 'category_limit', targetCategory: '交通', maxCount: 2, duration: 7, rewardExp: 50 },
    { id: 'no_shopping_7', name: '7天不购物', desc: '7天内不记录购物类消费', type: 'no_category', targetCategory: '购物', duration: 7, rewardExp: 80 },
    { id: 'food_budget_30', name: '30天餐饮≤600', desc: '30天内餐饮类累计消费不超过600元', type: 'amount_limit', targetCategory: '餐饮', maxAmount: 600, duration: 30, rewardExp: 150 }
  ]
  ```
- 预期产出：4 个预设挑战
- 验证：挑战数据完整

**任务 7.2：挑战列表与加入**
- 操作：
  - "进行中"区域：显示状态为 in_progress 的挑战（名称、进度条、剩余天数、当前进度值）
  - "更多挑战"区域：显示未加入的预设挑战，每个有"加入"按钮
  - 点击加入：创建 challenge 记录（startDate=今天，status=in_progress，progress=0），保存到 `challenges`
  - 挑战详情弹窗：规则说明、奖励、当前进度
- 预期产出：挑战可浏览和加入
- 验证：点击加入后挑战出现在"进行中"区域

**任务 7.3：挑战自动检测**
- 操作：在 `onRecordAdded` 中调用 `checkChallenges(record)`
  - 遍历所有 status=in_progress 的挑战
  - 计算挑战已进行天数 = 今天 - startDate + 1
  - 根据类型检测：
    - `no_category`：如果记录分类匹配且关键词匹配 → status=failed，记录失败时间
    - `category_limit`：统计挑战期内该分类记录数，超过 maxCount → failed
    - `amount_limit`：统计挑战期内该分类累计金额，超过 maxAmount → failed
  - 检测是否完成（已进行天数 >= duration 且未 failed）：status=success，奖励宠物经验（rewardExp），弹出成功通知
  - 更新进度值
- 预期产出：挑战自动检测
- 验证：加入"30天不喝奶茶"后，记一笔"奶茶 15"，挑战状态变为 failed

**任务 7.4：存钱罐 UI 与逻辑**
- 操作：
  - 未设置目标时：显示"设置存钱目标"按钮，点击输入目标金额
  - 已设置目标：
    - 小猪 emoji 🐷（随进度变化：空罐 🐷、半满 🐖、满满 🐷💰）
    - 当前金额 / 目标金额 + 进度条 + 百分比
    - "存入"按钮：输入金额，加到 currentAmount
    - "取出"按钮：输入金额，从 currentAmount 扣除（不超过当前金额）
    - "重置"按钮：二次确认后清零
  - 达成检测：currentAmount >= targetAmount 且 !achieved → achieved=true，播放庆祝动画，记录 achievedAt
- 预期产出：存钱罐功能完整
- 验证：设置目标 500，存入 300，进度 60%，小猪半满；存入 200 达成目标，播放庆祝

**阶段 7 完成标志**：4 个预设挑战可浏览/加入，记账后自动检测挑战状态（违反则失败，到期则成功并奖励经验），存钱罐可设目标/存入/取出/重置，进度和小猪形象正确，达成有庆祝动画。

---

### 阶段 8：心情标签与壁纸生成

**任务 8.1：心情标签功能**
- 操作：
  - 在账单详情页实现 4 个心情按钮（开心😊/一般😐/难过😢/冲动😤），点击切换并保存到 record.mood
  - 账单列表中，有 mood 的记录显示对应小 emoji 标签
  - 设置中可开关心情标签功能（关闭后详情页不显示心情按钮，列表不显示标签）
- 预期产出：心情标签可用
- 验证：详情页标记"冲动"后，列表显示 😤 标签

**任务 8.2：月度心情统计**
- 操作：
  - 在概览页或月度统计中，显示当月各心情的消费金额和笔数
  - 重点突出"冲动"消费：单独卡片显示冲动消费总额、笔数、占比
  - 无心情记录时显示"本月还没有标记心情的记录"
- 预期产出：心情统计正确
- 验证：标记 3 笔冲动消费后，统计显示冲动消费总额和占比

**任务 8.3：Canvas 壁纸生成**
- 操作：
  - 选择月份（默认当月）
  - Canvas 尺寸：1080 × 1920（竖屏手机壁纸比例）
  - 绘制内容：
    - 奶油白背景 `#FFF8F0`
    - 顶部暖橘装饰条 + 月份标题"2026年9月账单"
    - 月度总开销（大字号）+ 记账笔数 + 记账天数
    - 分类占比小环形图（Canvas 中嵌套绘制）
    - 最大一笔消费
    - 宠物形象 emoji + 等级 + 一句金句（如"每一笔都算数"、"坚持记账的你超棒"）
    - 底部装饰元素
  - 预览：将 Canvas 缩小显示在页面中
  - 保存：`canvas.toDataURL('image/png')` → 创建 `<a download="账单壁纸_YYYYMM.png">` 触发下载
- 预期产出：壁纸可生成和保存
- 验证：生成的壁纸包含月度数据和宠物形象，保存后手机相册可查看

**阶段 8 完成标志**：心情标签可标记/显示/统计，冲动消费单独分析，Canvas 壁纸可选择月份生成预览并保存为 PNG。

---

### 阶段 9：数据管理与设置

**任务 9.1：导出备份**
- 操作：
  - 读取全部 LocalStorage 数据
  - JSON.stringify（带缩进，便于阅读）
  - 创建 Blob（type: application/json）
  - 文件名：`记账备份_YYYYMMDD_HHMMSS.json`
  - 创建 `<a>` 元素，href=URL.createObjectURL(blob)，download=文件名，触发点击
  - 提示"备份已导出：文件名"
- 预期产出：JSON 备份文件可下载
- 验证：导出的文件用文本编辑器打开，包含所有数据字段

**任务 9.2：导入备份**
- 操作：
  - 文件选择 `<input type="file" accept=".json">`
  - 读取文件内容，JSON.parse
  - 验证格式：必须包含 records、categories、budget、pet 等核心字段，且 version 存在
  - 验证失败：提示"备份文件格式不正确"
  - 验证成功：弹出二次确认"将覆盖当前所有数据，确认导入？导入后当前数据无法恢复。"
  - 确认后：Storage.write(导入数据)，刷新所有页面，提示"导入成功"
- 预期产出：备份可导入恢复
- 验证：导出当前数据 → 清空 → 导入导出的文件 → 数据完全恢复

**任务 9.3：清空数据**
- 操作：
  - 点击"清空全部数据"
  - 弹窗："确定要清空所有数据吗？此操作不可恢复！"
  - 要求输入"确认"二字（输入框），输入正确后"确认清空"按钮才可用
  - 清空后：Storage.clear()，重新调用 init() 初始化默认数据，跳转到记账 Tab，显示欢迎消息
- 预期产出：清空需强确认
- 验证：不输入"确认"时按钮不可用；输入后清空，数据恢复初始状态

**任务 9.4：设置页与关于页整合**
- 操作：
  - 我的 Tab 列表式布局，每个设置项一行
  - 预算管理（跳转预算设置页）
  - 分类管理（跳转分类管理页）
  - 心情标签开关
  - 宠物设置（改名/重置）
  - 数据管理（导出/导入/清空）
  - 关于：版本号 v1.0、设计说明"温暖治愈 · 奶油橘猫风"、宠物名字
- 预期产出：设置页完整
- 验证：所有设置项可点击并正常工作

**阶段 9 完成标志**：导出备份生成有效 JSON，导入备份可完整恢复数据，清空需输入"确认"且恢复初始状态，设置页所有功能正常，关于页显示版本信息。

---

### 阶段 10：Capacitor 打包与 APK 构建

**任务 10.1：应用图标配置**
- 操作：
  - 准备应用图标（小猫 emoji 风格 + 暖橘背景，1024×1024 PNG）
  - 使用 `@capacitor/assets` 或手动生成各尺寸图标，放入 `android/app/src/main/res/` 对应 mipmap 目录
  - 配置 `android/app/build.gradle` 中的 applicationId 和版本
- 预期产出：APP 安装后桌面显示自定义图标
- 验证：APK 安装后桌面图标为小猫暖橘图标

**任务 10.2：启动画面配置**
- 操作：
  - 准备启动画面图（奶油白背景 + 小猫 emoji + "记账小猫"文字）
  - 配置 Capacitor 启动画面（splash），设置自动隐藏时间 1.5 秒
  - 背景色 `#FFF8F0`
- 预期产出：启动时显示启动画面
- 验证：打开 APP 先显示启动画面，1.5 秒后进入首页

**任务 10.3：全屏与沉浸式配置**
- 操作：
  - 在 `capacitor.config.json` 中配置全屏相关选项
  - 修改 `android/app/src/main/res/values/styles.xml`，设置 NoActionBar 主题
  - 配置状态栏颜色为奶油白 `#FFF8F0`，状态栏文字深色
  - 配置 `android:windowSoftInputMode="adjustResize"`（输入框弹出时页面调整）
- 预期产出：APP 全屏运行，状态栏与页面融合
- 验证：打开 APP 无标题栏，状态栏颜色正确，输入框弹出时不遮挡

**任务 10.4：同步与构建**
- 操作：
  ```bash
  npx cap sync android
  cd android
  ./gradlew assembleDebug
  ```
  （Windows 用 `gradlew.bat assembleDebug`）
- 预期产出：APK 文件生成在 `android/app/build/outputs/apk/debug/app-debug.apk`
- 验证：APK 文件存在且大小合理（约 5-15MB）

**任务 10.5：安装测试**
- 操作：将 APK 传到安卓手机，允许未知来源安装，打开测试
- 预期产出：APP 可安装、可启动、功能正常
- 验证：安装成功，启动后显示首页，记账功能正常，关闭重开数据不丢

**阶段 10 完成标志**：APK 构建成功，可在安卓手机安装运行，桌面图标和启动画面正确，全屏显示，所有功能在真机上正常工作。

---

### 阶段 11：测试与优化

**任务 11.1：全流程走查**
- 操作：按 PRD 第 10 章验收标准逐项测试
  - 安装启动（6 项）
  - 聊天记账（8 项）
  - 今日概览（9 项）
  - 开销记录（7 项）
  - 分类管理（5 项）
  - 预算提醒（7 项）
  - 宠物养成（8 项）
  - 徽章系统（5 项）
  - 连续打卡（6 项）
  - 省钱挑战（5 项）
  - 存钱罐（5 项）
  - 壁纸生成（4 项）
  - 心情标签（3 项）
  - 数据管理（6 项）
  - 视觉交互（7 项）
- 预期产出：所有验收项通过
- 验证：逐项勾选，记录失败项并修复

**任务 11.2：边界情况测试**
- 操作：
  - 金额为 0、负数、超大数（999999）
  - 输入特殊字符、emoji、超长文本
  - 跨月（手动修改系统时间或数据模拟）
  - 大量数据（1000 条记录）下的列表滚动性能
  - 预算刚好 1200（精准达标）
  - 分类删除后历史记录的处理
  - 导入旧版本/损坏的 JSON
- 预期产出：边界情况无崩溃
- 验证：所有边界情况 APP 不崩溃，有合理的错误提示

**任务 11.3：性能优化**
- 操作：
  - 列表渲染优化（大量记录时只渲染可视区域或分页）
  - Canvas 图表高清屏适配（devicePixelRatio）
  - 避免重复计算（数据变更时才重新渲染）
  - CSS 动画使用 transform/opacity（GPU 加速）
  - 图片资源压缩（图标、启动画面）
- 预期产出：APP 运行流畅
- 验证：1000 条记录下列表滚动无明显卡顿，页面切换流畅

**任务 11.4：最终 APK 构建与交付**
- 操作：
  - 修复所有 Bug 后重新构建 release 或 debug APK
  - 重命名为 `记账小猫_v1.0.apk`
  - 复制到项目目录
  - 编写简短的使用说明（如何安装、核心操作）
- 预期产出：最终 APK + 使用说明
- 验证：APK 可正常安装使用

**阶段 11 完成标志**：PRD 第 10 章所有验收标准通过，边界情况无崩溃，APP 运行流畅，最终 APK 交付。

---

## 三、开发顺序与依赖关系

```
阶段0（项目初始化）
    │
    ▼
阶段1（基础框架与数据层）◄── 所有后续阶段的基础
    │
    ▼
阶段2（核心记账流程）◄── 最高优先级，onRecordAdded 事件是趣味功能的触发点
    │
    ├──► 阶段3（概览与账单）── 依赖阶段2的记录数据
    │
    ├──► 阶段4（分类与预算）── 依赖阶段2的记账事件
    │
    ├──► 阶段5（宠物养成）── 依赖阶段2的记账事件 + 阶段4的预算数据
    │
    ├──► 阶段6（徽章与打卡）── 依赖阶段2的记账事件 + 阶段5的宠物
    │
    ├──► 阶段7（挑战与存钱罐）── 依赖阶段2的记账事件
    │
    ├──► 阶段8（心情与壁纸）── 依赖阶段3的账单详情 + 月度统计
    │
    └──► 阶段9（数据管理与设置）── 可与其他阶段并行，最后整合
    │
    ▼
阶段10（Capacitor打包）── 所有Web功能完成后
    │
    ▼
阶段11（测试与优化）── 最终验证
```

**关键路径**：阶段 0 → 1 → 2 → 4/5 → 10 → 11  
**可并行**：阶段 3、6、7、8、9 可在阶段 2 完成后并行开发（但单线程执行时按顺序）

---

## 四、风险与注意事项

| 风险 | 影响 | 应对措施 |
|---|---|---|
| Android Studio/SDK 未装好 | 无法构建 APK | 阶段 0 先验证环境，用户同步安装 |
| LocalStorage 容量限制（约 5MB） | 大量记录或壁纸数据可能溢出 | 记录数据为纯文本，1000 条约 1MB，足够个人使用；壁纸不存 LocalStorage |
| 单 HTML 文件过大 | 加载慢、维护难 | 控制在 2000 行以内，内部分区清晰，JS 按模块组织 |
| Canvas 图表在不同设备尺寸下变形 | 视觉问题 | 使用 devicePixelRatio 适配，容器宽度动态计算 |
| 自然语言解析覆盖不全 | 用户输入识别失败 | 预设别名映射，识别失败时给明确示例，后续可扩展 |
| 跨月数据计算错误 | 预算/统计不准确 | 所有月度计算基于 record.date 字段，统一用 YYYY-MM 格式 |
| APK 安装被手机拦截 | 用户无法安装 | 提供"允许未知来源"安装说明 |
| 导入恶意 JSON | 数据安全 | 导入时严格验证字段格式，HTML 转义所有用户输入 |

---

## 五、文件产出清单

开发完成后，项目目录应包含：

```
记账app/
├── PRD.md                          # 产品需求文档
├── DEVELOPMENT_PLAN.md             # 本开发计划
├── package.json                    # npm 配置
├── capacitor.config.json           # Capacitor 配置
├── www/
│   └── index.html                  # 单文件 Web 应用（所有 CSS/JS 内联）
├── android/                        # Capacitor 安卓项目
│   ├── app/
│   │   └── build/outputs/apk/debug/app-debug.apk  # 构建产物
│   └── ...
├── 记账小猫_v1.0.apk               # 最终交付 APK（重命名后）
└── 使用说明.md                      # 安装和使用说明
```

---

> 本计划基于 PRD v1.0 制定，开发过程中如 PRD 有变更，需同步更新本计划。
