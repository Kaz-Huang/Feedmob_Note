@echo off
chcp 65001 >nul
title Feedmob WorkLog 极简工作日志系统
cd /d "%~dp0"

echo ===================================================
echo   🚀 Feedmob WorkLog 极简工作日志系统
echo   正在检查运行环境并启动服务...
echo ===================================================
echo.

:: 检查是否存在 node_modules，若无则自动安装依赖
if not exist "node_modules\" (
    echo [1/3] 检测到首次运行，正在自动安装依赖 (npm install)...
    call npm install
) else (
    echo [1/3] 依赖检查已通过...
)

:: 检查数据库是否初始化
if not exist "prisma\dev.db" (
    echo [2/3] 正在初始化本地数据库与初始数据...
    call npx prisma db push
    call node prisma/seed.js
) else (
    echo [2/3] 本地数据库已就绪...
)

echo [3/3] 正在启动开发服务...
echo.
echo ===================================================
echo   ✅ 服务启动成功！
echo   🌐 正在为您自动打开浏览器: http://localhost:3000
echo   💡 提示: 保持此窗口开启，按 Ctrl + C 可关闭服务
echo ===================================================
echo.

:: 延迟 2 秒自动在默认浏览器中打开页面
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: 启动 Next.js 开发服务
npm run dev
