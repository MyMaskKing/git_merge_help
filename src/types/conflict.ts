export interface ConflictMarker {
  start: number
  end: number
  type: 'ours' | 'theirs' | 'base'
  content: string
}

export interface ConflictRegion {
  ours: ConflictMarker
  theirs: ConflictMarker
  base?: ConflictMarker
  resolved?: boolean
  resolution?: string
}

export interface ConflictFile {
  path: string
  regions: ConflictRegion[]
  status: 'unresolved' | 'resolved' | 'reviewing'
  type: 'add' | 'modify' | 'delete'
  originalContent: string
  currentContent: string
}

export interface ConflictStats {
  total: number
  resolved: number
  unresolved: number
  reviewing: number
}

export type ConflictResolutionStrategy = 'ours' | 'theirs' | 'custom'

export interface ConflictResolution {
  file: string
  strategy: ConflictResolutionStrategy
  content?: string
}

export interface ConflictContext {
  sourceBranch: string
  targetBranch: string
  files: ConflictFile[]
  stats: ConflictStats
  currentFile?: string
} 