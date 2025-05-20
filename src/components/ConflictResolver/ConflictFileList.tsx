import { useCallback, useMemo } from 'react'
import { useConflictStore, selectConflictFiles, selectConflictStats } from '@/lib/git/conflict-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileIcon, FolderIcon, CheckCircleIcon, AlertCircleIcon, EyeIcon } from 'lucide-react'
import { ConflictFile } from '@/types/conflict'

interface ConflictFileItemProps {
  file: ConflictFile
  isSelected: boolean
  onClick: (path: string) => void
}

const ConflictFileItem = ({ file, isSelected, onClick }: ConflictFileItemProps) => {
  const statusIcons = {
    resolved: <CheckCircleIcon className="h-4 w-4 text-green-500" />,
    unresolved: <AlertCircleIcon className="h-4 w-4 text-red-500" />,
    reviewing: <EyeIcon className="h-4 w-4 text-blue-500" />,
  }

  const statusColors = {
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    unresolved: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    reviewing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  }

  const typeColors = {
    add: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
    modify: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    delete: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100',
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full justify-start gap-2 px-2 py-1 h-auto',
        isSelected && 'bg-accent'
      )}
      onClick={() => onClick(file.path)}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate flex-1">{file.path}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Badge variant="secondary" className={typeColors[file.type]}>
            {file.type}
          </Badge>
          <Badge variant="secondary" className={statusColors[file.status]}>
            {statusIcons[file.status]}
            <span className="ml-1">{file.status}</span>
          </Badge>
        </div>
      </div>
    </Button>
  )
}

interface FileGroup {
  directory: string
  files: ConflictFile[]
}

export function ConflictFileList() {
  const files = useConflictStore(selectConflictFiles)
  const stats = useConflictStore(selectConflictStats)
  const currentFile = useConflictStore((state) => state.currentFile)
  const setCurrentFile = useConflictStore((state) => state.setCurrentFile)

  const fileGroups = useMemo(() => {
    const groups = new Map<string, ConflictFile[]>()
    
    files.forEach((file) => {
      const directory = file.path.split('/').slice(0, -1).join('/') || '/'
      if (!groups.has(directory)) {
        groups.set(directory, [])
      }
      groups.get(directory)!.push(file)
    })

    return Array.from(groups.entries())
      .map(([directory, files]) => ({
        directory,
        files: files.sort((a, b) => a.path.localeCompare(b.path)),
      }))
      .sort((a, b) => a.directory.localeCompare(b.directory))
  }, [files])

  const handleFileClick = useCallback((path: string) => {
    setCurrentFile(path)
  }, [setCurrentFile])

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        没有发现冲突文件
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-2">冲突文件</h3>
        <div className="flex gap-2 text-sm">
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            未解决: {stats.unresolved}
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            审查中: {stats.reviewing}
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            已解决: {stats.resolved}
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {fileGroups.map(({ directory, files }) => (
            <div key={directory} className="mb-4">
              <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                <FolderIcon className="h-4 w-4" />
                <span>{directory}</span>
              </div>
              <div className="space-y-1">
                {files.map((file) => (
                  <ConflictFileItem
                    key={file.path}
                    file={file}
                    isSelected={file.path === currentFile}
                    onClick={handleFileClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
} 