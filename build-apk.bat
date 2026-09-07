@echo off
chcp 65001 >nul
echo ========================================
echo   记账小猫 APP - APK 构建脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 内联 core.js 到 index.html...
node scripts\inline-core.js
if errorlevel 1 (
    echo 内联失败！
    pause
    exit /b 1
)
echo.

echo [2/3] 同步 Web 资源到 Android 项目...
call npx cap sync android
if errorlevel 1 (
    echo 同步失败！
    pause
    exit /b 1
)
echo.

echo [3/3] 构建 Debug APK...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (
    echo.
    echo 构建失败！请检查：
    echo   1. 是否已安装 Android Studio
    echo   2. 是否已配置 JAVA_HOME 和 ANDROID_HOME
    echo   3. 是否安装了所需的 Android SDK Platform
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo   构建成功！
echo ========================================
echo.
echo APK 文件位置:
echo   android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 将此文件传输到安卓手机即可安装使用。
echo.
pause
