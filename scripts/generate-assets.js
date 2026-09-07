/**
 * 生成Android各尺寸应用图标和启动画面
 * 用法: node scripts/generate-assets.js
 */
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RES_DIR = path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'res');

// 应用图标尺寸
const ICON_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

// 启动画面尺寸（宽x高，竖屏）
const SPLASH_SIZES = {
  'drawable-port-mdpi': [480, 800],
  'drawable-port-hdpi': [720, 1280],
  'drawable-port-xhdpi': [960, 1600],
  'drawable-port-xxhdpi': [1440, 2560],
  'drawable-port-xxxhdpi': [1920, 3200]
};

async function generateIcons() {
  const iconPath = path.join(PROJECT_ROOT, 'assets', 'icon.png');
  if (!fs.existsSync(iconPath)) {
    console.error('未找到 assets/icon.png');
    process.exit(1);
  }
  const icon = await Jimp.read(iconPath);

  for (const [dir, size] of Object.entries(ICON_SIZES)) {
    const dirPath = path.join(RES_DIR, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    const resized = icon.clone().resize(size, size);
    await resized.writeAsync(path.join(dirPath, 'ic_launcher.png'));
    await resized.writeAsync(path.join(dirPath, 'ic_launcher_round.png'));
    console.log(`✓ 图标 ${dir}: ${size}x${size}`);
  }
}

async function generateSplashes() {
  const splashPath = path.join(PROJECT_ROOT, 'assets', 'splash.png');
  if (!fs.existsSync(splashPath)) {
    console.error('未找到 assets/splash.png');
    process.exit(1);
  }
  const splash = await Jimp.read(splashPath);

  for (const [dir, [w, h]] of Object.entries(SPLASH_SIZES)) {
    const dirPath = path.join(RES_DIR, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    // 按比例缩放并裁剪居中
    const resized = splash.clone().cover(w, h);
    await resized.writeAsync(path.join(dirPath, 'splash.png'));
    console.log(`✓ 启动画面 ${dir}: ${w}x${h}`);
  }

  // 同时生成默认drawable目录的splash（用于横屏和兜底）
  const defaultDir = path.join(RES_DIR, 'drawable');
  if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });
  const defaultSplash = splash.clone().cover(1024, 2048);
  await defaultSplash.writeAsync(path.join(defaultDir, 'splash.png'));
  console.log('✓ 启动画面 drawable: 1024x2048');
}

async function main() {
  console.log('开始生成Android资源...');
  await generateIcons();
  await generateSplashes();
  console.log('\n🎉 所有资源生成完成！');
}

main().catch(err => {
  console.error('生成失败:', err);
  process.exit(1);
});
