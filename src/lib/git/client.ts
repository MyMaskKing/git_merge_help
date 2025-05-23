import * as git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import { Buffer } from 'buffer'
import { createLightningFSAdapter } from './fs-lightning-adapter'
import { FSAdapter } from './fs-adapter'

// 创建文件系统适配器
let fs: FSAdapter;

// 延迟初始化文件系统，只在客户端执行
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
}

export interface GitConfig {
  token: string
  owner?: string
  repo?: string
  repoUrl?: string
}

export interface MergeResult {
  success: boolean
  conflictFiles?: string[]
  error?: string
}

export interface FileContent {
  content: string
  encoding: string
}

export class GitClient {
  private config: GitConfig
  private corsProxy: string = 'https://cors.isomorphic-git.org'
  private dir: string = '/workspace'
  private initialized: boolean = false

  constructor(config: GitConfig) {
    try {
      console.log('初始化Git客户端...');
      // 确保在服务器端渲染时不会初始化
      if (typeof window === 'undefined') {
        throw new Error('GitClient只能在浏览器环境中使用');
      }
      this.config = config;
      // 验证配置
      if (!this.config.token) {
        throw new Error('必须提供token');
      }
      if (!this.config.repoUrl && !(this.config.owner && this.config.repo)) {
        throw new Error('必须提供repoUrl或owner和repo');
      }
      console.log('Git客户端配置验证成功');
      this.initialized = true;
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

  private getAuth() {
    this.ensureInitialized();
    return {
      username: this.config.token,
    }
  }

  private getUrl(): string {
    this.ensureInitialized();
    if (this.config.repoUrl) {
      return this.config.repoUrl
    }
    
    if (this.config.owner && this.config.repo) {
      return `https://github.com/${this.config.owner}/${this.config.repo}.git`
    }
    
    throw new Error('仓库信息不完整，需要提供repoUrl或owner和repo')
  }

  async clone(): Promise<void> {
    try {
      this.ensureInitialized();
      console.log('开始克隆仓库...');
      console.log('仓库URL:', this.getUrl());
      
      await git.clone({
        fs: getFS(),
        http,
        dir: this.dir,
        url: this.getUrl(),
        corsProxy: this.corsProxy,
        singleBranch: false,
        depth: 1,
        onAuth: () => this.getAuth(),
        onProgress: (event) => {
          console.log('克隆进度:', event);
        },
        onMessage: (message) => {
          console.log('克隆消息:', message);
        },
      })
      console.log('仓库克隆成功');
    } catch (error) {
      console.error('克隆仓库失败:', error);
      throw new Error(`克隆仓库失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async checkout(branch: string): Promise<void> {
    try {
      await git.checkout({
        fs: getFS(),
        dir: this.dir,
        ref: branch,
      })
    } catch (error) {
      console.error('切换分支失败:', error)
      throw new Error('切换分支失败')
    }
  }

  async merge(sourceBranch: string): Promise<MergeResult> {
    try {
      await git.merge({
        fs: getFS(),
        dir: this.dir,
        theirs: sourceBranch,
        author: {
          name: 'Git Merge Manager',
          email: 'git-merge-manager@example.com',
        },
      })

      // 检查是否有冲突
      const status = await git.statusMatrix({ 
        fs: getFS(), 
        dir: this.dir 
      })
      
      const conflictFiles = status
        .filter(([, , worktreeStatus, stageStatus]) => worktreeStatus > 0 && stageStatus > 0)
        .map(([filepath]) => filepath as string)

      return {
        success: conflictFiles.length === 0,
        conflictFiles: conflictFiles.length > 0 ? conflictFiles : undefined,
      }
    } catch (error) {
      console.error('合并分支失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '合并分支失败',
      }
    }
  }

  async getFileContent(branch: string, path: string): Promise<FileContent> {
    try {
      // 保存当前分支
      const currentBranch = await git.currentBranch({
        fs: getFS(),
        dir: this.dir,
      })

      // 切换到目标分支
      await this.checkout(branch)

      // 读取文件内容
      const content = await git.readFile({
        fs: getFS(),
        dir: this.dir,
        filepath: path,
      })

      // 切回原分支
      if (currentBranch) {
        await this.checkout(currentBranch)
      }

      return {
        content: typeof content === 'string' ? content : new TextDecoder().decode(content as Uint8Array),
        encoding: 'utf8',
      }
    } catch (error) {
      console.error('获取文件内容失败:', error)
      throw new Error('获取文件内容失败')
    }
  }

  async getWorkingContent(path: string): Promise<FileContent> {
    try {
      const content = await git.readFile({
        fs: getFS(),
        dir: this.dir,
        filepath: path,
      })

      return {
        content: typeof content === 'string' ? content : new TextDecoder().decode(content as Uint8Array),
        encoding: 'utf8',
      }
    } catch (error) {
      console.error('获取工作区文件内容失败:', error)
      throw new Error('获取工作区文件内容失败')
    }
  }

  async getConflictFiles(): Promise<string[]> {
    try {
      const status = await git.statusMatrix({
        fs: getFS(),
        dir: this.dir,
      })

      return status
        .filter(([, , worktreeStatus, stageStatus]) => worktreeStatus > 0 && stageStatus > 0)
        .map(([filepath]) => filepath as string)
    } catch (error) {
      console.error('获取冲突文件失败:', error)
      throw new Error('获取冲突文件失败')
    }
  }

  async resolveConflict(
    file: string,
    content: string
  ): Promise<void> {
    try {
      // 写入解决后的内容
      await getFS().promises.writeFile(
        `${this.dir}/${file}`, 
        Buffer.from(content)
      );
      
      // 标记为已解决
      await git.add({
        fs: getFS(),
        dir: this.dir,
        filepath: file,
      })
    } catch (error) {
      console.error('解决冲突失败:', error)
      throw new Error('解决冲突失败')
    }
  }

  async commit(message: string): Promise<string> {
    try {
      const sha = await git.commit({
        fs: getFS(),
        dir: this.dir,
        message,
        author: {
          name: 'Git Merge Manager',
          email: 'git-merge-manager@example.com',
        },
      })
      return sha;
    } catch (error) {
      console.error('提交更改失败:', error)
      throw new Error('提交更改失败')
    }
  }

  async push(): Promise<void> {
    try {
      await git.push({
        fs: getFS(),
        http,
        dir: this.dir,
        url: this.getUrl(),
        corsProxy: this.corsProxy,
        onAuth: () => this.getAuth(),
      })
    } catch (error) {
      console.error('推送更改失败:', error)
      throw new Error('推送更改失败')
    }
  }

  async pull(branch: string): Promise<void> {
    try {
      // 确保在正确的分支上
      await this.checkout(branch)
      
      // 执行pull操作
      await git.pull({
        fs: getFS(),
        http,
        dir: this.dir,
        url: this.getUrl(),
        corsProxy: this.corsProxy,
        ref: branch,
        singleBranch: true,
        author: {
          name: 'Git Merge Manager',
          email: 'git-merge-manager@example.com'
        },
        onAuth: () => this.getAuth(),
      })
    } catch (error) {
      console.error('拉取分支失败:', error)
      throw new Error('拉取分支失败')
    }
  }
} 