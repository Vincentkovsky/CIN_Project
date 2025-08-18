import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// 创建一个自定义插件来添加API端点
function floodFoldersPlugin() {
  return {
    name: 'flood-folders-api',
    configureServer(server) {
      server.middlewares.use('/api/list-flood-folders', (req, res) => {
        try {
          const floodTilesDir = path.resolve(__dirname, 'data/flood_tiles');
          
          // 读取文件夹内容
          const folders = fs.readdirSync(floodTilesDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name);
          
          // 返回JSON格式的文件夹列表
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(folders));
        } catch (error) {
          console.error('Error reading flood tiles directories:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to read flood tiles directories' }));
        }
      });
    }
  };
}

export default defineConfig({
  // 环境变量已经由Vite自动处理，不需要额外配置
  plugins: [
    floodFoldersPlugin()
  ],
  // Windows 性能优化配置
  server: {
    // 提高开发服务器性能
    watch: {
      usePolling: process.platform === 'win32', // Windows 文件监听优化
      interval: 100,
      binaryInterval: 300
    },
    // 启用文件系统缓存
    fs: {
      cachedChecks: false
    }
  },
  // 构建优化
  build: {
    // 启用代码分割和压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        // 移除 console.log（生产环境）
        drop_console: true,
        drop_debugger: true
      }
    },
    // 减少 chunk 大小
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'deck': ['deck.gl', '@deck.gl/layers', '@deck.gl/geo-layers', '@deck.gl/mesh-layers'],
          'mapbox': ['mapbox-gl', 'react-map-gl'],
          'mui': ['@mui/material', '@mui/icons-material']
        }
      }
    }
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'deck.gl', 
      '@deck.gl/layers',
      '@deck.gl/geo-layers', 
      '@deck.gl/mesh-layers',
      'mapbox-gl', 
      'react-map-gl',
      '@mui/material',
      '@mui/icons-material'
    ]
  }
});
