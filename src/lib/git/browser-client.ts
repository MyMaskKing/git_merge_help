import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { Buffer } from 'buffer';
import { createLightningFSAdapter } from './fs-lightning-adapter';

// 创建纯浏览器文件系统适配器
const fs = createLightningFSAdapter('git-merge-manager');

export interface GitBrowserConfig {
  token: string;
  repoUrl: string;
}

export class GitBrowserClient {
  private config: GitBrowserConfig;
  private corsProxy: string = 'https://cors.isomorphic-git.org';
  private dir: string = '/workspace';

  constructor(config: GitBrowserConfig) {
    this.config = config;
  }

  // 初始化仓库
  async init(): Promise<void> {
    try {
      // 克隆仓库到浏览器文件系统
      await git.clone({
        fs,
        http,
        dir: this.dir,
        url: this.config.repoUrl,
        corsProxy: this.corsProxy,
        singleBranch: false,
        depth: 1,
        onAuth: () => ({ username: this.config.token }),
      });
    } catch (error) {
      console.error('初始化仓库失败:', error);
      throw new Error('初始化仓库失败');
    }
  }

  // 获取所有分支
  async getBranches(): Promise<string[]> {
    try {
      const branches = await git.listBranches({
        fs,
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
      await git.checkout({
        fs,
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
      await this.checkout(branch);
      
      await git.pull({
        fs,
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
      // 切换到目标分支
      await this.checkout(targetBranch);
      
      // 执行合并
      const result = await git.merge({
        fs,
        dir: this.dir,
        theirs: sourceBranch,
        author: {
          name: 'Git Merge Manager',
          email: 'user@example.com',
        },
      });

      // 检查是否有冲突
      const statusMatrix = await git.statusMatrix({ fs, dir: this.dir });
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
      const result = await fs.promises.readFile(`${this.dir}/${path}`);
      return typeof result === 'string' ? result : new TextDecoder().decode(result as Uint8Array);
    } catch (error) {
      console.error('获取文件内容失败:', error);
      throw new Error('获取文件内容失败');
    }
  }

  // 解决冲突
  async resolveConflict(path: string, content: string): Promise<void> {
    try {
      // 写入解决后的内容
      await fs.promises.writeFile(
        `${this.dir}/${path}`, 
        Buffer.from(content)
      );
      
      // 标记为已解决
      await git.add({
        fs,
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
      const sha = await git.commit({
        fs,
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
      await git.push({
        fs,
        http,
        dir: this.dir,
        onAuth: () => ({ username: this.config.token }),
      });
    } catch (error) {
      console.error('推送更改失败:', error);
      throw new Error('推送更改失败');
    }
  }
} 