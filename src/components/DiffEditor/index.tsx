import { useEffect, useRef, useState, memo, useCallback, useMemo } from 'react'
import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Search, Sun, Moon, ChevronDown, ChevronUp, Check, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { DiffEditorErrorBoundary } from './ErrorBoundary'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// 编辑器配置选项
const EDITOR_OPTIONS = {
  base: {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on',
    quickSuggestions: true,
    formatOnPaste: true,
    formatOnType: true,
    maxTokenizationLineLength: 20000, // 限制单行标记化长度
    largeFileOptimizations: true, // 大文件优化
    wordWrap: 'on', // 自动换行
  },
  diff: {
    renderSideBySide: true,
    enableSplitViewResizing: true,
    ignoreTrimWhitespace: false,
    renderIndicators: true,
    renderMarginRevertIcon: true,
    renderOverviewRuler: true,
    diffWordWrap: 'on',
    maxComputationTime: 5000, // 最大差异计算时间（毫秒）
    maxFileSize: 50000000, // 最大文件大小（字节）
  },
} as const

// 差异缓存接口
interface DiffCache {
  original: string
  modified: string
  changes: editor.ILineChange[]
}

interface DiffEditorProps {
  original: string
  modified: string
  language?: string
  readOnly?: boolean
  onChange?: (value: string) => void
  height?: string | number
  theme?: 'vs-dark' | 'light'
}

export const DiffEditor = memo(function DiffEditor({
  original,
  modified,
  language = 'typescript',
  readOnly = false,
  onChange,
  height = '500px',
  theme: initialTheme = 'vs-dark',
}: DiffEditorProps) {
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
  const diffCacheRef = useRef<DiffCache | null>(null)
  const [isFormatting, setIsFormatting] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(initialTheme === 'vs-dark')
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [isFoldingEnabled, setIsFoldingEnabled] = useState(true)
  const [isSnippetMode, setIsSnippetMode] = useState(false)
  const [currentDiffIndex, setCurrentDiffIndex] = useState(0)
  const [totalDiffs, setTotalDiffs] = useState(0)
  const [isLargeFile, setIsLargeFile] = useState(false)

  // 检查是否为大文件
  const checkLargeFile = useCallback((content: string) => {
    const size = new Blob([content]).size
    return size > EDITOR_OPTIONS.diff.maxFileSize
  }, [])

  // 使用useMemo缓存编辑器选项
  const editorOptions = useMemo(() => ({
    ...EDITOR_OPTIONS.base,
    readOnly,
    folding: isFoldingEnabled,
    foldingStrategy: 'indentation',
    showFoldingControls: 'always',
    snippetSuggestions: isSnippetMode ? 'inline' : 'none',
    suggest: {
      snippetsPreventQuickSuggestions: false,
    },
  }), [readOnly, isFoldingEnabled, isSnippetMode])

  // 使用useMemo缓存差异编辑器选项
  const diffOptions = useMemo(() => ({
    ...EDITOR_OPTIONS.diff,
    renderSideBySide: !isLargeFile, // 大文件时使用内联视图
    enableSplitViewResizing: !isLargeFile,
  }), [isLargeFile])

  // 获取差异信息（带缓存）
  const getDiffInformation = useCallback(() => {
    if (!editorRef.current) return null

    // 检查缓存是否有效
    if (
      diffCacheRef.current &&
      diffCacheRef.current.original === original &&
      diffCacheRef.current.modified === modified
    ) {
      return { changes: diffCacheRef.current.changes }
    }

    const diffModel = editorRef.current.getModel()
    if (!diffModel) return null
    
    const { original: originalModel, modified: modifiedModel } = diffModel
    if (!originalModel || !modifiedModel) return null

    const lineChanges = editorRef.current.getLineChanges()
    if (lineChanges) {
      // 更新缓存
      diffCacheRef.current = {
        original,
        modified,
        changes: lineChanges,
      }
      return { changes: lineChanges }
    }
    return null
  }, [original, modified])

  // 更新差异计数（使用防抖）
  const updateDiffCount = useCallback(() => {
    const diffInfo = getDiffInformation()
    if (!diffInfo) return
    
    const count = diffInfo.changes.length
    setTotalDiffs(count)
    if (currentDiffIndex >= count) {
      setCurrentDiffIndex(count > 0 ? count - 1 : 0)
    }
  }, [getDiffInformation, currentDiffIndex])

  // 使用useEffect检查文件大小
  useEffect(() => {
    const isOriginalLarge = checkLargeFile(original)
    const isModifiedLarge = checkLargeFile(modified)
    setIsLargeFile(isOriginalLarge || isModifiedLarge)
  }, [original, modified, checkLargeFile])

  // 使用useEffect处理差异更新
  useEffect(() => {
    if (!editorRef.current) return

    const editor = editorRef.current
    const disposable = editor.onDidUpdateDiff(() => {
      updateDiffCount()
    })

    return () => {
      disposable.dispose()
    }
  }, [updateDiffCount])

  useEffect(() => {
    if (editorRef.current) {
      const modifiedEditor = editorRef.current.getModifiedEditor()
      modifiedEditor.updateOptions({ readOnly })
    }
  }, [readOnly])

  // 导航到下一个差异
  const navigateToNextDiff = () => {
    if (!editorRef.current) return
    
    const diffInfo = getDiffInformation()
    if (!diffInfo || !diffInfo.changes.length) return

    const nextIndex = (currentDiffIndex + 1) % diffInfo.changes.length
    const change = diffInfo.changes[nextIndex]
    
    editorRef.current.revealLineInCenter(change.modifiedStartLineNumber)
    setCurrentDiffIndex(nextIndex)
  }

  // 导航到上一个差异
  const navigateToPrevDiff = () => {
    if (!editorRef.current) return
    
    const diffInfo = getDiffInformation()
    if (!diffInfo || !diffInfo.changes.length) return

    const prevIndex = currentDiffIndex > 0 ? currentDiffIndex - 1 : diffInfo.changes.length - 1
    const change = diffInfo.changes[prevIndex]
    
    editorRef.current.revealLineInCenter(change.modifiedStartLineNumber)
    setCurrentDiffIndex(prevIndex)
  }

  function handleEditorDidMount(editor: editor.IStandaloneDiffEditor) {
    editorRef.current = editor
    
    // 设置编辑器选项
    const modifiedEditor = editor.getModifiedEditor()
    modifiedEditor.updateOptions(editorOptions)

    // 设置差异编辑器选项
    editor.updateOptions(diffOptions)

    // 监听修改事件
    if (onChange) {
      const disposable = modifiedEditor.onDidChangeModelContent(() => {
        const value = modifiedEditor.getValue()
        onChange(value)
      })

      // 清理监听器
      return () => {
        disposable.dispose()
      }
    }
  }

  // 格式化代码
  async function handleFormat() {
    if (!editorRef.current) return

    setIsFormatting(true)
    try {
      const modifiedEditor = editorRef.current.getModifiedEditor()
      await modifiedEditor.getAction('editor.action.formatDocument')?.run()
      
      // 如果有onChange回调，通知内容变化
      if (onChange) {
        const value = modifiedEditor.getValue()
        onChange(value)
      }
    } catch (err) {
      console.error('格式化代码失败:', err)
    } finally {
      setIsFormatting(false)
    }
  }

  // 切换主题
  function handleThemeToggle() {
    setIsDarkTheme(!isDarkTheme)
  }

  // 切换搜索面板
  function handleSearchToggle() {
    if (!editorRef.current) return

    const modifiedEditor = editorRef.current.getModifiedEditor()
    if (!isSearchVisible) {
      modifiedEditor.getAction('actions.find')?.run()
    } else {
      modifiedEditor.getAction('closeMarkersNavigation')?.run()
    }
    setIsSearchVisible(!isSearchVisible)
  }

  // 切换代码折叠
  function handleFoldingToggle() {
    if (!editorRef.current) return

    const modifiedEditor = editorRef.current.getModifiedEditor()
    const newFoldingState = !isFoldingEnabled
    setIsFoldingEnabled(newFoldingState)
    modifiedEditor.updateOptions({ folding: newFoldingState })
  }

  // 跳转到指定行
  function handleGoToLine() {
    if (!editorRef.current) return

    const modifiedEditor = editorRef.current.getModifiedEditor()
    modifiedEditor.getAction('editor.action.gotoLine')?.run()
  }

  // 切换代码片段模式
  function handleSnippetModeToggle() {
    if (!editorRef.current) return

    const modifiedEditor = editorRef.current.getModifiedEditor()
    const newSnippetMode = !isSnippetMode
    setIsSnippetMode(newSnippetMode)
    modifiedEditor.updateOptions({
      snippetSuggestions: newSnippetMode ? 'inline' : 'none',
    })
  }

  return (
    <DiffEditorErrorBoundary>
      <div className="space-y-2" role="region" aria-label="代码差异编辑器">
        <div className="flex justify-between gap-2">
          <div className="flex items-center gap-2" role="toolbar" aria-label="差异导航工具栏">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={cn(
                      'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'h-8 w-8 p-0'
                    )}
                    onClick={navigateToPrevDiff}
                    disabled={totalDiffs === 0}
                    aria-label="上一个差异"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>上一个差异 (Alt+↑)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={cn(
                      'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'h-8 w-8 p-0'
                    )}
                    onClick={navigateToNextDiff}
                    disabled={totalDiffs === 0}
                    aria-label="下一个差异"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>下一个差异 (Alt+↓)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {totalDiffs > 0 && (
              <span className="text-sm text-muted-foreground" role="status" aria-live="polite">
                当前差异：{currentDiffIndex + 1} / {totalDiffs}
              </span>
            )}
          </div>
          <div className="flex gap-2" role="toolbar" aria-label="编辑器工具栏">
            {!readOnly && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={cn(
                          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          'h-8 px-3 text-xs'
                        )}
                        onClick={handleFormat}
                        disabled={isFormatting}
                        aria-label="格式化代码"
                      >
                        {isFormatting ? '格式化中...' : '格式化'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>格式化代码 (Ctrl+S)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={cn(
                          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          'h-8 w-8 p-0'
                        )}
                        onClick={handleSearchToggle}
                        aria-label="搜索"
                        aria-pressed={isSearchVisible}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>搜索 (Ctrl+F)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={cn(
                          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          'h-8 w-8 p-0',
                          !isFoldingEnabled && 'bg-accent text-accent-foreground'
                        )}
                        onClick={handleFoldingToggle}
                        aria-label="切换代码折叠"
                        aria-pressed={!isFoldingEnabled}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>切换代码折叠</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={cn(
                          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          'h-8 w-8 p-0'
                        )}
                        onClick={handleGoToLine}
                        aria-label="跳转到行"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>跳转到行 (Ctrl+G)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={cn(
                          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          'h-8 w-8 p-0',
                          isSnippetMode && 'bg-accent text-accent-foreground'
                        )}
                        onClick={handleSnippetModeToggle}
                        aria-label="切换代码片段模式"
                        aria-pressed={isSnippetMode}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>切换代码片段模式</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={cn(
                      'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'h-8 w-8 p-0'
                    )}
                    onClick={handleThemeToggle}
                    aria-label="切换主题"
                    aria-pressed={isDarkTheme}
                  >
                    {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>切换主题</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div 
          className={cn(
            "border rounded-md overflow-hidden", 
            typeof height === 'number' ? `h-[${height}px]` : `h-[${height}]`,
            isLargeFile && 'opacity-90' // 大文件时添加视觉提示
          )}
          role="application"
          aria-label="代码差异查看器"
        >
          {isLargeFile && (
            <div className="absolute top-0 left-0 right-0 bg-yellow-100 dark:bg-yellow-900 p-2 text-sm text-yellow-800 dark:text-yellow-200 z-10">
              大文件模式：已启用性能优化
            </div>
          )}
          <MonacoDiffEditor
            height="100%"
            original={original}
            modified={modified}
            language={language}
            theme={isDarkTheme ? 'vs-dark' : 'light'}
            onMount={handleEditorDidMount}
            options={diffOptions}
            loading={<div className="flex items-center justify-center h-full">加载中...</div>}
          />
        </div>
      </div>
    </DiffEditorErrorBoundary>
  )
}) 