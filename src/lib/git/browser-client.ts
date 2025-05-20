import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { Buffer } from 'buffer';
import { createLightningFSAdapter } from './fs-lightning-adapter';
import { FSAdapter } from './fs-adapter';

// 延迟初始化文件系统
let fs: FSAdapter;

const getFS = () => {
  if (!fs) {
    try {
      console.log('初始化文件系统...');
      fs = createLightningFSAdapter('git-merge-manager');
      console.log('文件系统初始化成功');
    } catch (error) {
      console.error('文件系统初始化失败:', error);
      throw error;
    }
  }
  return fs;
};

export interface GitBrowserConfig {
  token: string;
  repoUrl: string;
}

export class GitBrowserClient {
  private config: GitBrowserConfig;
  private corsProxy: string = 'https://cors.isomorphic-git.org';
  private dir: string = '/workspace';
  private initialized: boolean = false;

  constructor(config: GitBrowserConfig) {
    try {
      console.log('初始化Git客户端...');
      if (typeof window === 'undefined') {
        throw new Error('GitBrowserClient只能在浏览器环境中使用');
      }
      if (!config.token) {
        throw new Error('必须提供token');
      }
      if (!config.repoUrl) {
        throw new Error('必须提供repoUrl');
      }
      this.config = config;
      this.initialized = true;
      console.log('Git客户端初始化成功');
    } catch (error) {
      console.error('Git客户端初始化失败:', error);
      throw error;
    }
  }

  private ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Git客户端未正确初始化');
    }
  }

  // 初始化仓库
  async init(): Promise<void> {
    try {
      this.ensureInitialized();
      console.log('开始克隆仓库...');
      console.log('仓库URL:', this.config.repoUrl);
      
      // 克隆仓库到浏览器文件系统
      await git.clone({
        fs: getFS(),
        http,
        dir: this.dir,
        url: this.config.repoUrl,
        corsProxy: this.corsProxy,
        singleBranch: false,
        depth: 1,
        onAuth: () => ({ username: this.config.token }),
        onProgress: (event) => {
          console.log('克隆进度:', event);
        },
        onMessage: (message) => {
          console.log('克隆消息:', message);
        },
      });
      console.log('仓库克隆成功');
    } catch (error) {
      console.error('初始化仓库失败:', error);
      throw new Error('初始化仓库失败');
    }
  }

  // 获取所有分支
  async getBranches(): Promise<string[]> {
    try {
      this.ensureInitialized();
      const branches = await git.listBranches({
        fs: getFS(),
        dir: this.dir,
        remote: 'origin'
      });
      return branches;
    } catch (error) {
      console.error('获取分支列表失败:', error);
      throw new Error('获取分支列表失败');
    }
  }

  // 检出分支
  async checkout(branch: string): Promise<void> {
    try {
      this.ensureInitialized();
      await git.checkout({
        fs: getFS(),
        dir: this.dir,
        ref: branch,
      });
    } catch (error) {
      console.error('切换分支失败:', error);
      throw new Error('切换分支失败');
    }
  }

  // 拉取分支最新代码
  async pull(branch: string): Promise<void> {
    try {
      this.ensureInitialized();
      await this.checkout(branch);
      
      await git.pull({
        fs: getFS(),
        http,
        dir: this.dir,
        ref: branch,
        singleBranch: true,
        author: {
          name: 'Git Merge Manager',
          email: 'user@example.com',
        },
        onAuth: () => ({ username: this.config.token }),
      });
    } catch (error) {
      console.error('拉取分支失败:', error);
      throw new Error('拉取分支失败');
    }
  }

  // 合并分支
  async merge(sourceBranch: string, targetBranch: string): Promise<{
    success: boolean;
    conflicts?: string[];
    error?: string;
  }> {
    try {
      this.ensureInitialized();
      // 切换到目标分支
      await this.checkout(targetBranch);
      
      // 执行合并
      const result = await git.merge({
        fs: getFS(),
        dir: this.dir,
        theirs: sourceBranch,
        author: {
          name: 'Git Merge Manager',
          email: 'user@example.com',
        },
      });

      // 检查是否有冲突
      const statusMatrix = await git.statusMatrix({ fs: getFS(), dir: this.dir });
      const conflicts = statusMatrix
        .filter(([, , workdir, stage]) => workdir > 0 && stage > 0)
        .map(([filepath]) => filepath as string);

      return {
        success: conflicts.length === 0,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error) {
      console.error('合并分支失败:', error);
      return {
        success: false,
        error: '合并分支失败',
      };
    }
  }

  // 获取文件内容
  async getFileContent(path: string): Promise<string> {
    try {
      this.ensureInitialized();
      const result = await getFS().promises.readFile(`${this.dir}/${path}`);
      return typeof result === 'string' ? result : new TextDecoder().decode(result as Uint8Array);
    } catch (error) {
      console.error('获取文件内容失败:', error);
      throw new Error('获取文件内容失败');
    }
  }

  // 解决冲突
  async resolveConflict(path: string, content: string): Promise<void> {
    try {
      this.ensureInitialized();
      // 写入解决后的内容
      await getFS().promises.writeFile(
        `${this.dir}/${path}`, 
        Buffer.from(content)
      );
      
      // 标记为已解决
      await git.add({
        fs: getFS(),
        dir: this.dir,
        filepath: path,
      });
    } catch (error) {
      console.error('解决冲突失败:', error);
      throw new Error('解决冲突失败');
    }
  }

  // 提交更改
  async commit(message: string): Promise<string> {
    try {
      this.ensureInitialized();
      const sha = await git.commit({
        fs: getFS(),
        dir: this.dir,
        message,
        author: {
          name: 'Git Merge Manager',
          email: 'user@example.com',
        },
      });
      return sha;
    } catch (error) {
      console.error('提交更改失败:', error);
      throw new Error('提交更改失败');
    }
  }

  // 推送更改
  async push(): Promise<void> {
    try {
      this.ensureInitialized();
      await git.push({
        fs: getFS(),
        http,
        dir: this.dir,
        url: this.config.repoUrl,
        corsProxy: this.corsProxy,
        onAuth: () => ({ username: this.config.token }),
      });
    } catch (error) {
      console.error('推送更改失败:', error);
      throw new Error('推送更改失败');
    }
  }
} 