import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GitClient, type MergeResult } from '@/lib/git/client'
import { ConflictResolver } from '@/components/ConflictResolver'
import type { GitHubRepo } from '@/lib/github/api'
import { useAuthStore } from '@/lib/store/auth'

interface MergeOperationProps {
  repo: GitHubRepo
  sourceBranch: string
  targetBranch: string
}

export function MergeOperation({
  repo,
  sourceBranch,
  targetBranch,
}: MergeOperationProps) {
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null)
  const [gitClient, setGitClient] = useState<GitClient | null>(null)

  async function handleMerge() {
    if (!token) return

    setLoading(true)
    setError(null)
    setMergeResult(null)

    try {
      const [owner, repoName] = repo.full_name.split('/')
      const client = new GitClient({
        token,
        owner,
        repo: repoName,
      })
      setGitClient(client)

      // 克隆仓库
      await client.clone()

      // 切换到目标分支
      await client.checkout(targetBranch)

      // 执行合并操作
      const result = await client.merge(sourceBranch)
      setMergeResult(result)

      if (result.success) {
        // 如果合并成功，提交并推送更改
        await client.commit(`Merge branch '${sourceBranch}' into ${targetBranch}`)
        await client.push()
      }
    } catch (err) {
      console.error('合并操作失败:', err)
      setError('合并操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  async function handleConflictResolved() {
    if (!gitClient || !token) return

    setLoading(true)
    setError(null)

    try {
      // 提交解决的冲突
      await gitClient.commit(`Resolve merge conflicts between ${sourceBranch} and ${targetBranch}`)
      await gitClient.push()

      // 更新合并结果
      setMergeResult({
        success: true,
      })
    } catch (err) {
      console.error('提交解决的冲突失败:', err)
      setError('提交解决的冲突失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">合并操作</h2>
        <Button
          onClick={handleMerge}
          disabled={loading}
        >
          {loading ? '合并中...' : '开始合并'}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {mergeResult && !mergeResult.success && mergeResult.conflictFiles && (
        <div className="space-y-4">
          <ConflictResolver
            repo={repo}
            conflictFiles={mergeResult.conflictFiles}
            sourceBranch={sourceBranch}
            targetBranch={targetBranch}
            onResolved={handleConflictResolved}
          />
        </div>
      )}

      {mergeResult?.success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-md">
          合并成功！更改已推送到远程仓库。
        </div>
      )}
    </div>
  )
} 