'use client';

import { useState } from 'react'
import { Editor } from '@monaco-editor/react'
import { Button } from '@/components/ui/button'

export function MergeViewer() {
  const [mergeResult, setMergeResult] = useState<string>('')
  const [hasConflicts, setHasConflicts] = useState<boolean>(true) // 暂时设为true，以显示冲突状态
  const [activeTab, setActiveTab] = useState<'code' | 'diff'>('code')

  // TODO: 从isomorphic-git获取merge结果
  const dummyCode = `
// 这里将显示合并结果
function example() {
  console.log('Hello World');
}

// 常见的冲突示例
<<<<<<< HEAD
function getCurrentBranch() {
  return 'main';
}
=======
function getCurrentBranch() {
  return 'develop';
}
>>>>>>> develop

export function init() {
  console.log('初始化应用');
}
`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex space-x-1 rounded-lg bg-muted p-1">
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'code' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('code')}
            >
              代码视图
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'diff' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('diff')}
            >
              差异视图
            </button>
          </div>
        </div>
        {hasConflicts && (
          <span className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            存在冲突需要解决
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border shadow-md">
        <div className="flex items-center justify-between bg-muted/50 px-4 py-2 border-b border-border/80">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-red-400"></span>
            <span className="h-3 w-3 rounded-full bg-yellow-400"></span>
            <span className="h-3 w-3 rounded-full bg-green-400"></span>
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              merge-result.ts
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
            </button>
          </div>
        </div>
        <div className="h-[500px]">
          <Editor
            height="100%"
            defaultLanguage="typescript"
            defaultValue={dummyCode}
            theme="vs-dark"
            options={{
              readOnly: !hasConflicts,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              hideCursorInOverviewRuler: true,
              glyphMargin: true,
              lightbulb: { enabled: true },
            }}
            onChange={(value) => {
              if (hasConflicts) {
                setMergeResult(value || '')
              }
            }}
          />
        </div>
      </div>

      {hasConflicts && (
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              提示：解决冲突后点击"解决冲突"按钮
            </span>
          </div>
          <div className="flex space-x-4">
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
              onClick={() => {
                // TODO: 取消merge操作
                console.log('Cancel merge')
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              取消合并
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary hover:shadow-md"
              onClick={() => {
                // TODO: 提交解决的冲突
                console.log('Resolve conflicts')
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              解决冲突
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 