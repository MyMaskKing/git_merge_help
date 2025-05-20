import * as git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import { Octokit } from '@octokit/rest'
import { Buffer } from 'buffer'
import { FSAdapter } from './fs-adapter'
import { withRetry, createGitError } from './error-handler'
import { OperationProgress, createProgressTracker } from './progress'

export interface GitConfig {
  fs: FSAdapter
  dir: string
  author: {
    name: string
    email: string
  }
}

export interface MergeResult {
  success: boolean
  conflicts?: string[]
  error?: string
  mergeCommit?: string
}

export interface MergePreviewResult {
  canMerge: boolean
  conflicts?: string[]
  changes?: {
    added: string[]
    modified: string[]
    deleted: string[]
  }
}

export class GitOperations {
  private fs: FSAdapter
  private dir: string
  private author: { name: string; email: string }
  private octokit?: Octokit
  private progress?: OperationProgress

  constructor(config: GitConfig, progress?: OperationProgress) {
    this.fs = config.fs
    this.dir = config.dir
    this.author = config.author
    this.progress = progress
  }

  setOctokit(octokit: Octokit) {
    this.octokit = octokit
  }

  private createProgressCallback() {
    if (!this.progress) return undefined

    const tracker = createProgressTracker(this.progress)
    return {
      onProgress: ({ loaded, total, phase }: { loaded: number; total: number; phase?: string }) => {
        if (phase) tracker.setPhase(phase)
        tracker.updateProgress(loaded, total, 'git')
      },
      onPhase: (phase: string) => {
        tracker.setPhase(phase)
      },
      onComplete: () => {
        tracker.complete()
      },
      onError: (error: Error) => {
        tracker.error(error)
      }
    }
  }

  async init() {
    return withRetry(
      async () => {
        await git.init({ fs: this.fs, dir: this.dir })
      },
      undefined,
      'init'
    )
  }

  async clone(url: string, branch?: string) {
    const progress = this.createProgressCallback()
    
    return withRetry(
      async () => {
        await git.clone({
          fs: this.fs,
          http,
          dir: this.dir,
          url,
          ref: branch,
          singleBranch: true,
          depth: 1,
          onProgress: progress?.onProgress,
          onPhase: progress?.onPhase,
        })
        progress?.onComplete()
        return true
      },
      undefined,
      'clone'
    ).catch(error => {
      progress?.onError(error)
      throw createGitError(error, 'clone', true)
    })
  }

  async getCurrentBranch(): Promise<string> {
    return withRetry(
      async () => {
        return await git.currentBranch({
          fs: this.fs,
          dir: this.dir,
        }) || ''
      },
      undefined,
      'getCurrentBranch'
    )
  }

  async listBranches(): Promise<string[]> {
    const progress = this.createProgressCallback()
    
    return withRetry(
      async () => {
        progress?.onPhase('list-branches')
        try {
          // 由于在浏览器环境中使用 isomorphic-git 的 fs 绑定存在问题，
          // 这里临时返回模拟数据以便界面开发
          // 实际生产环境中，应该使用有效的文件系统适配器
          console.error('列出分支失败: 正在使用模拟数据替代')
          
          // 这里返回模拟的分支数据
          const mockBranches = ['main', 'develop', 'feature/user-auth', 'feature/git-merge']
          
          progress?.onComplete()
          return mockBranches
        } catch (error) {
          console.error('列出分支失败:', error)
          progress?.onError(error as Error)
          throw createGitError(error, 'listBranches', true)
        }
      },
      undefined,
      'listBranches'
    )
  }

  async checkoutBranch(branchName: string): Promise<void> {
    const progress = this.createProgressCallback()
    
    return withRetry(
      async () => {
        progress?.onPhase('checkout')
        await git.checkout({
          fs: this.fs,
          dir: this.dir,
          ref: branchName,
        })
        progress?.onComplete()
      },
      undefined,
      'checkout'
    ).catch(error => {
      progress?.onError(error)
      throw createGitError(error, 'checkout', true)
    })
  }

  async previewMerge(sourceBranch: string, targetBranch: string): Promise<MergePreviewResult> {
    const progress = this.createProgressCallback()
    
    return withRetry(
      async () => {
        progress?.onPhase('merge-preview')
        
        // 获取两个分支的最新状态
        const sourceRef = await git.resolveRef({
          fs: this.fs,
          dir: this.dir,
          ref: sourceBranch,
        })

        const targetRef = await git.resolveRef({
          fs: this.fs,
          dir: this.dir,
          ref: targetBranch,
        })

        // 检查是否有冲突
        const mergeResult = await git.merge({
          fs: this.fs,
          dir: this.dir,
          ours: targetRef,
          theirs: sourceRef,
          dryRun: true,
        })

        if (mergeResult.alreadyMerged) {
          progress?.onComplete()
          return {
            canMerge: true,
            changes: {
              added: [],
              modified: [],
              deleted: [],
            },
          }
        }

        // 获取更改的文件列表
        const changes = await this.getChangedFiles(sourceRef, targetRef)
        progress?.onComplete()

        return {
          canMerge: !mergeResult.conflicts,
          conflicts: mergeResult.conflicts ? Object.keys(mergeResult.conflicts) : undefined,
          changes,
        }
      },
      undefined,
      'previewMerge'
    ).catch(error => {
      progress?.onError(error)
      throw createGitError(error, 'previewMerge', false)
    })
  }

  async merge(sourceBranch: string, targetBranch: string): Promise<MergeResult> {
    const progress = this.createProgressCallback()
    
    return withRetry(
      async () => {
        progress?.onPhase('merge')
        
        // 确保我们在目标分支上
        await this.checkoutBranch(targetBranch)

        // 执行合并
        const mergeResult = await git.merge({
          fs: this.fs,
          dir: this.dir,
          theirs: sourceBranch,
          author: this.author,
        })

        progress?.onComplete()

        if (mergeResult.conflicts) {
          return {
            success: false,
            conflicts: Object.keys(mergeResult.conflicts),
          }
        }

        return {
          success: true,
          mergeCommit: mergeResult.oid,
        }
      },
      undefined,
      'merge'
    ).catch(error => {
      progress?.onError(error)
      throw createGitError(error, 'merge', false)
    })
  }

  private async getChangedFiles(sourceRef: string, targetRef: string) {
    const changes = {
      added: [] as string[],
      modified: [] as string[],
      deleted: [] as string[],
    }

    // 获取两个提交之间的差异
    const sourceTree = await git.readTree({
      fs: this.fs,
      dir: this.dir,
      oid: sourceRef,
    })

    const targetTree = await git.readTree({
      fs: this.fs,
      dir: this.dir,
      oid: targetRef,
    })

    // 比较两个树
    await git.walk({
      fs: this.fs,
      dir: this.dir,
      trees: [sourceTree, targetTree],
      map: async function(filepath, [A, B]) {
        if (!A && B) changes.added.push(filepath)
        else if (A && !B) changes.deleted.push(filepath)
        else if (A && B && A.oid !== B.oid) changes.modified.push(filepath)
      },
    })

    return changes
  }

  async resolveConflict(
    filePath: string,
    content: string,
    markAsResolved: boolean = true
  ): Promise<void> {
    const progress = this.createProgressCallback()
    
    return withRetry(
      async () => {
        progress?.onPhase('resolve-conflict')
        
        // 写入解决后的内容
        await this.fs.promises.writeFile(
          `${this.dir}/${filePath}`,
          Buffer.from(content)
        )

        if (markAsResolved) {
          // 标记文件为已解决
          await git.add({
            fs: this.fs,
            dir: this.dir,
            filepath: filePath,
          })
        }

        progress?.onComplete()
      },
      undefined,
      'resolveConflict'
    ).catch(error => {
      progress?.onError(error)
      throw createGitError(error, 'resolveConflict', true)
    })
  }

  async commitChanges(message: string): Promise<string> {
    const progress = this.createProgressCallback()
    
    return withRetry(
      async () => {
        progress?.onPhase('commit')
        const commitResult = await git.commit({
          fs: this.fs,
          dir: this.dir,
          message,
          author: this.author,
        })
        progress?.onComplete()
        return commitResult
      },
      undefined,
      'commit'
    ).catch(error => {
      progress?.onError(error)
      throw createGitError(error, 'commit', true)
    })
  }

  async push(branch: string): Promise<void> {
    if (!this.octokit) {
      throw new Error('Octokit not initialized. Please set GitHub token first.')
    }

    const progress = this.createProgressCallback()
    
    return withRetry(
      async () => {
        progress?.onPhase('push')
        await git.push({
          fs: this.fs,
          http,
          dir: this.dir,
          remote: 'origin',
          ref: branch,
        })
        progress?.onComplete()
      },
      undefined,
      'push'
    ).catch(error => {
      progress?.onError(error)
      throw createGitError(error, 'push', true)
    })
  }
} 