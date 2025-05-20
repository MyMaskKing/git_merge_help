'use client';

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { GitOperations } from '@/lib/git/GitOperations'
import { useConflictStore } from '@/lib/git/conflict-store'
import { createMemoryFS } from '@/lib/git/fs-adapter'

export function BranchSelector() {
  const [sourceBranch, setSourceBranch] = useState<string>('')
  const [targetBranch, setTargetBranch] = useState<string>('')
  const [branchList, setBranchList] = useState<string[]>(['main', 'develop', 'feature/dashboard', 'feature/auth'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setBranches = useConflictStore(state => state.setBranches)

  useEffect(() => {
    async function loadBranches() {
      setLoading(true)
      setError(null)
      try {
        const fs = createMemoryFS()
        const git = new GitOperations({
          fs,
          dir: process.cwd(),
          author: {
            name: 'Git Manager',
            email: 'git@manager.com'
          }
        })
        
        // 获取分支列表
        const branches = await git.listBranches()
        if (branches && branches.length > 0) {
          setBranchList(branches)
        }
      } catch (err) {
        console.error('加载分支列表失败:', err)
        setError('加载分支列表失败，使用默认分支列表')
        // 即使出错，我们也有默认分支可用
      } finally {
        setLoading(false)
      }
    }

    loadBranches()
  }, [])

  const handleSourceBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSourceBranch(value)
    setBranches(value, targetBranch)
  }

  const handleTargetBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setTargetBranch(value)
    setBranches(sourceBranch, value)
  }

  // 分支标签渲染
  const renderBranchTag = (branch: string) => {
    let color = '';
    if (branch === 'main') color = 'bg-blue-100 text-blue-800 border-blue-300';
    else if (branch === 'develop') color = 'bg-purple-100 text-purple-800 border-purple-300';
    else if (branch.startsWith('feature/')) color = 'bg-green-100 text-green-800 border-green-300';
    else color = 'bg-gray-100 text-gray-800 border-gray-300';
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        {branch}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label htmlFor="source-branch" className="block text-sm font-medium">
            源分支
          </label>
          <div className="relative">
            <select
              id="source-branch"
              value={sourceBranch}
              onChange={handleSourceBranchChange}
              className="custom-select pr-10 focus:ring-primary"
            >
              <option value="" disabled>
                选择源分支
              </option>
              {branchList.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          {sourceBranch && (
            <div className="mt-2 pl-2 border-l-2 border-primary">
              <span className="text-xs text-muted-foreground">已选择: </span>
              {renderBranchTag(sourceBranch)}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <label htmlFor="target-branch" className="block text-sm font-medium">
            目标分支
          </label>
          <div className="relative">
            <select
              id="target-branch"
              value={targetBranch}
              onChange={handleTargetBranchChange}
              className="custom-select pr-10 focus:ring-primary"
            >
              <option value="" disabled>
                选择目标分支
              </option>
              {branchList.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          {targetBranch && (
            <div className="mt-2 pl-2 border-l-2 border-secondary">
              <span className="text-xs text-muted-foreground">已选择: </span>
              {renderBranchTag(targetBranch)}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive border border-destructive/20">
          <div className="flex">
            <svg className="h-5 w-5 text-destructive mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        </div>
      )}

      {sourceBranch && targetBranch && (
        <div className="bg-muted/30 p-4 rounded-md">
          <p className="text-sm">
            将 {renderBranchTag(sourceBranch)} 合并到 {renderBranchTag(targetBranch)}
          </p>
        </div>
      )}

      <Button
        className="merge-btn w-full md:w-auto"
        disabled={!sourceBranch || !targetBranch || loading}
        onClick={() => {
          // TODO: 触发merge操作
          console.log('Merge', sourceBranch, 'into', targetBranch)
        }}
      >
        {loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载中...
          </span>
        ) : (
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8 9 12 5 16 9"></polyline>
              <line x1="12" y1="5" x2="12" y2="19"></line>
            </svg>
            开始合并
          </span>
        )}
      </Button>
    </div>
  )
} 