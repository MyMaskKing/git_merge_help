import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { GitClient } from '@/lib/git/client'
import type { GitHubRepo } from '@/lib/github/api'
import { useAuthStore } from '@/lib/store/auth'
import { DiffEditor } from '@/components/DiffEditor'

interface DiffViewerProps {
  repo: GitHubRepo
  file: string
  sourceBranch: string
  targetBranch: string
  onResolve: (content: string) => void
}

interface DiffContent {
  source: string
  target: string
  merged: string
}

export function DiffViewer({
  repo,
  file,
  sourceBranch,
  targetBranch,
  onResolve,
}: DiffViewerProps) {
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diffContent, setDiffContent] = useState<DiffContent | null>(null)
  const [mergedContent, setMergedContent] = useState('')

  useEffect(() => {
    loadDiffContent()
  }, [file, sourceBranch, targetBranch])

  async function loadDiffContent() {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const [owner, repoName] = repo.full_name.split('/')
      const gitClient = new GitClient({
        token,
        owner,
        repo: repoName,
      })

      // 获取源分支的文件内容
      const sourceContent = await gitClient.getFileContent(sourceBranch, file)

      // 获取目标分支的文件内容
      const targetContent = await gitClient.getFileContent(targetBranch, file)

      // 获取当前工作区的文件内容（包含冲突标记）
      const workingContent = await gitClient.getWorkingContent(file)

      setDiffContent({
        source: sourceContent.content,
        target: targetContent.content,
        merged: workingContent.content,
      })
      setMergedContent(workingContent.content)
    } catch (err) {
      console.error('加载文件差异失败:', err)
      setError('加载文件差异失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  function handleContentChange(content: string) {
    setMergedContent(content)
  }

  function handleResolve() {
    onResolve(mergedContent)
  }

  if (loading) {
    return <div className="p-4 text-center">加载中...</div>
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        {error}
        <Button
          className="mt-2"
          onClick={loadDiffContent}
        >
          重试
        </Button>
      </div>
    )
  }

  if (!diffContent) {
    return null
  }

  // 获取文件扩展名
  const fileExt = file.split('.').pop() || ''
  const language = fileExt === 'ts' || fileExt === 'tsx' ? 'typescript'
    : fileExt === 'js' || fileExt === 'jsx' ? 'javascript'
    : fileExt === 'json' ? 'json'
    : fileExt === 'md' ? 'markdown'
    : fileExt === 'css' ? 'css'
    : fileExt === 'html' ? 'html'
    : 'plaintext'

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-medium">文件差异</h3>
        <DiffEditor
          original={diffContent.source}
          modified={diffContent.target}
          language={language}
          readOnly={true}
        />
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">合并结果</h3>
        <DiffEditor
          original={diffContent.target}
          modified={mergedContent}
          language={language}
          readOnly={false}
          onChange={handleContentChange}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleResolve}>
          保存更改
        </Button>
      </div>
    </div>
  )
} 