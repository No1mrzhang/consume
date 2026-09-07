/**
 * 测试运行器
 * 用法：node tests/runner.js [阶段号]
 * 不带参数运行所有测试；带参数只运行指定阶段的测试
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const TESTS_DIR = __dirname;
const PROJECT_ROOT = path.resolve(TESTS_DIR, '..');

let passed = 0;
let failed = 0;
let currentSuite = '';
const failures = [];

// 钩子栈（支持describe嵌套）
const hookStack = [{ beforeEach: [], afterEach: [] }];

function currentHooks() {
  return hookStack[hookStack.length - 1];
}

// 全局测试对象
global.test = function (name, fn) {
  // 执行所有栈帧的beforeEach
  for (let i = 0; i < hookStack.length; i++) {
    hookStack[i].beforeEach.forEach(hook => {
      try { hook(); } catch (e) {
        failed++;
        failures.push({ suite: currentSuite, name: '[beforeEach] ' + name, error: e });
        console.log('  ✗ [beforeEach] ' + name);
        console.log('    ' + (e.message || e).toString().split('\n').join('\n    '));
        return;
      }
    });
  }
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed++;
    failures.push({ suite: currentSuite, name, error: e });
    console.log('  ✗ ' + name);
    console.log('    ' + (e.message || e).toString().split('\n').join('\n    '));
  }
  // 执行所有栈帧的afterEach（逆序）
  for (let i = hookStack.length - 1; i >= 0; i--) {
    hookStack[i].afterEach.forEach(hook => {
      try { hook(); } catch (e) {
        console.log('  ⚠ [afterEach错误] ' + (e.message || e));
      }
    });
  }
};

global.describe = function (name, fn) {
  currentSuite = name;
  console.log('\n' + name);
  hookStack.push({ beforeEach: [], afterEach: [] });
  try {
    fn();
  } finally {
    hookStack.pop();
  }
};

global.beforeEach = function (fn) {
  currentHooks().beforeEach.push(fn);
};

global.afterEach = function (fn) {
  currentHooks().afterEach.push(fn);
};

global.assert = assert;
global.PROJECT_ROOT = PROJECT_ROOT;

// 读取测试文件
const stageFilter = process.argv[2] ? String(process.argv[2]) : null;
const testFiles = fs.readdirSync(TESTS_DIR)
  .filter(f => f.endsWith('.test.js'))
  .filter(f => !stageFilter || f.startsWith('stage' + stageFilter + '.'))
  .sort();

if (testFiles.length === 0) {
  console.log('没有找到测试文件' + (stageFilter ? '（阶段 ' + stageFilter + '）' : ''));
  process.exit(0);
}

console.log('========== 记账小猫 APP 测试 ==========');
console.log('测试文件: ' + testFiles.join(', '));

testFiles.forEach(file => {
  require(path.join(TESTS_DIR, file));
});

console.log('\n========== 测试结果 ==========');
console.log('通过: ' + passed + '  失败: ' + failed + '  总计: ' + (passed + failed));

if (failed > 0) {
  console.log('\n失败详情:');
  failures.forEach((f, i) => {
    console.log((i + 1) + '. [' + f.suite + '] ' + f.name);
    console.log('   ' + (f.error.message || f.error).toString().split('\n').join('\n   '));
  });
  process.exit(1);
} else {
  console.log('\n🎉 全部测试通过！');
  process.exit(0);
}
