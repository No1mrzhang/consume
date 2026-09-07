/**
 * 将core.js内联到index.html中（用于构建APK）
 * 用法: node scripts/inline-core.js
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const corePath = path.join(PROJECT_ROOT, 'www', 'core.js');
const htmlPath = path.join(PROJECT_ROOT, 'www', 'index.html');

const coreJs = fs.readFileSync(corePath, 'utf8');
let html = fs.readFileSync(htmlPath, 'utf8');

if (html.includes('<script src="core.js"></script>')) {
  // 外部引用，直接替换为内联
  html = html.replace('<script src="core.js"></script>', '<script>\n' + coreJs + '\n</script>');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('✓ core.js 已内联到 index.html（从外部引用替换）');
} else {
  // 已经内联，替换内联的script块（匹配包含storageKey特征的script块）
  const inlineRegex = /<script>\s*(?:[^<]|<(?!\/script>))*?accounting_app_data[\s\S]*?<\/script>/;
  if (inlineRegex.test(html)) {
    html = html.replace(inlineRegex, '<script>\n' + coreJs + '\n</script>');
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('✓ core.js 已重新内联到 index.html（更新内联内容）');
  } else {
    console.log('⚠ 未找到 core.js 引用或内联块，请检查 index.html');
    process.exit(1);
  }
}
console.log('  index.html 大小:', (fs.statSync(htmlPath).size / 1024).toFixed(1), 'KB');
