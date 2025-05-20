import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DiffViewer } from '@/components/DiffViewer'
import type { GitHubRepo } from '@/lib/github/api'
import { useAuthStore } from '@/lib/store/auth'

interface ConflictResolverProps {
  repo: GitHubRepo
  conflictFiles: string[]
  sourceBranch: string
  targetBranch: string
  onResolved: () => void
}

export function ConflictResolver({
  repo,
  conflictFiles,
  sourceBranch,
  targetBranch,
  onResolved,
}: ConflictResolverProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleResolveConflict(content: string) {
    if (!selectedFile) return

    setLoading(true)
    setError(null)

    try {
      // TODO: 调用GitClient的resolveConflict方法
      setSelectedFile(null)
      onResolved()
    } catch (err) {
      console.error('解决冲突失败:', err)
      setError('解决冲突失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">冲突文件</h2>
        <div className="grid gap-4">
          {conflictFiles.map(file => (
            <div
              key={file}
              className={`p-4 border rounded-lg hover:bg-accent cursor-pointer ${
                selectedFile === file ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedFile(file)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{file}</span>
                <Button
                  className="text-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(file)
                  }}
                >
                  查看冲突
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedFile && (
        <div className="space-y-4">
          <DiffViewer
            repo={repo}
            file={selectedFile}
            sourceBranch={sourceBranch}
            targetBranch={targetBranch}
            onResolve={handleResolveConflict}
          />
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}
    </div>
  )
} 