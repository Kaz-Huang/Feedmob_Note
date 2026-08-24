import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 显式锁定当前目录为项目根目录，避免 Next.js 误将父目录识别为 Workspace 导致文件监听失效
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 针对 Windows 环境增强文件监听与热更新 (HMR / Fast Refresh)
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // 每秒轮询检测文件变动（彻底解决 Windows/非英文路径下文件事件丢失问题）
        aggregateTimeout: 300, // 防抖延迟
      };
    }
    return config;
  },
};

export default nextConfig;
