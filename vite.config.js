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
  ]
});
