import { create } from 'zustand'
import {
  ConflictContext,
  ConflictFile,
  ConflictResolution,
  ConflictStats,
} from '@/types/conflict'

interface ConflictStore extends ConflictContext {
  // 更新冲突文件列表
  setFiles: (files: ConflictFile[]) => void
  // 更新单个文件状态
  updateFile: (path: string, updates: Partial<ConflictFile>) => void
  // 设置当前选中的文件
  setCurrentFile: (path: string | undefined) => void
  // 解决冲突
  resolveConflict: (resolution: ConflictResolution) => void
  // 重置状态
  reset: () => void
  // 更新分支信息
  setBranches: (sourceBranch: string, targetBranch: string) => void
}

const calculateStats = (files: ConflictFile[]): ConflictStats => {
  return files.reduce(
    (acc, file) => {
      switch (file.status) {
        case 'resolved':
          acc.resolved++
          break
        case 'unresolved':
          acc.unresolved++
          break
        case 'reviewing':
          acc.reviewing++
          break
      }
      return acc
    },
    { total: files.length, resolved: 0, unresolved: 0, reviewing: 0 }
  )
}

export const useConflictStore = create<ConflictStore>((set, get) => ({
  sourceBranch: '',
  targetBranch: '',
  files: [],
  stats: { total: 0, resolved: 0, unresolved: 0, reviewing: 0 },
  currentFile: undefined,

  setFiles: (files) => {
    set({
      files,
      stats: calculateStats(files),
    })
  },

  updateFile: (path, updates) => {
    const files = get().files.map((file) =>
      file.path === path ? { ...file, ...updates } : file
    )
    set({
      files,
      stats: calculateStats(files),
    })
  },

  setCurrentFile: (path) => {
    set({ currentFile: path })
  },

  resolveConflict: (resolution) => {
    const files = get().files.map((file) => {
      if (file.path !== resolution.file) return file

      return {
        ...file,
        status: 'resolved' as const,
        currentContent: resolution.content || file.currentContent,
      }
    })

    set({
      files,
      stats: calculateStats(files),
    })
  },

  reset: () => {
    set({
      sourceBranch: '',
      targetBranch: '',
      files: [],
      stats: { total: 0, resolved: 0, unresolved: 0, reviewing: 0 },
      currentFile: undefined,
    })
  },

  setBranches: (sourceBranch, targetBranch) => {
    set({ sourceBranch, targetBranch })
  },
}))

// 选择器
export const selectConflictFiles = (state: ConflictStore) => state.files
export const selectConflictStats = (state: ConflictStore) => state.stats
export const selectCurrentFile = (state: ConflictStore) => {
  const { files, currentFile } = state
  return files.find((f) => f.path === currentFile)
}
export const selectBranches = (state: ConflictStore) => ({
  sourceBranch: state.sourceBranch,
  targetBranch: state.targetBranch,
}) 