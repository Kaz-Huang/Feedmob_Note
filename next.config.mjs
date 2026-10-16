import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// A build shares one ID between the client bundle and .next/BUILD_ID. Workers
// inherit it; starting a previously built image never changes the built ID.
const appVersion = process.env.MINEWORK_BUILD_VERSION || randomUUID();
process.env.MINEWORK_BUILD_VERSION = appVersion;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => appVersion,
  env: { NEXT_PUBLIC_APP_VERSION: appVersion },
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
