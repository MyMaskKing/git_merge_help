import { Buffer } from 'buffer'

export interface FSAdapter {
  promises: {
    readFile: (path: string) => Promise<Buffer>
    writeFile: (path: string, data: Buffer) => Promise<void>
    unlink: (path: string) => Promise<void>
    readdir: (path: string) => Promise<string[]>
    mkdir: (path: string) => Promise<void>
    rmdir: (path: string) => Promise<void>
    stat: (path: string) => Promise<{ isDirectory: () => boolean }>
    lstat: (path: string) => Promise<{ isFile: () => boolean }>
  }
  readFileSync: (path: string) => Buffer
  writeFileSync: (path: string, data: Buffer) => void
  unlinkSync: (path: string) => void
  readdirSync: (path: string) => string[]
  mkdirSync: (path: string) => void
  rmdirSync: (path: string) => void
  statSync: (path: string) => { isDirectory: () => boolean }
  lstatSync: (path: string) => { isFile: () => boolean }
}

class MemoryFS implements FSAdapter {
  private files: Map<string, Buffer>
  private dirs: Set<string>

  constructor() {
    this.files = new Map()
    this.dirs = new Set()
    this.dirs.add('/')
  }

  private normalizePath(path: string): string {
    return path.startsWith('/') ? path : `/${path}`
  }

  private getParentDir(path: string): string {
    const normalized = this.normalizePath(path)
    return normalized.substring(0, normalized.lastIndexOf('/')) || '/'
  }

  private ensureParentDir(path: string): void {
    const parent = this.getParentDir(path)
    if (!this.dirs.has(parent)) {
      this.ensureParentDir(parent)
      this.dirs.add(parent)
    }
  }

  promises = {
    readFile: async (path: string): Promise<Buffer> => {
      const normalized = this.normalizePath(path)
      const content = this.files.get(normalized)
      if (!content) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`)
      }
      return content
    },

    writeFile: async (path: string, data: Buffer): Promise<void> => {
      const normalized = this.normalizePath(path)
      this.ensureParentDir(normalized)
      this.files.set(normalized, data)
    },

    unlink: async (path: string): Promise<void> => {
      const normalized = this.normalizePath(path)
      if (!this.files.has(normalized)) {
        throw new Error(`ENOENT: no such file or directory, unlink '${path}'`)
      }
      this.files.delete(normalized)
    },

    readdir: async (path: string): Promise<string[]> => {
      const normalized = this.normalizePath(path)
      if (!this.dirs.has(normalized)) {
        throw new Error(`ENOENT: no such file or directory, scandir '${path}'`)
      }
      const entries = new Set<string>()
      for (const file of this.files.keys()) {
        if (file.startsWith(normalized) && file !== normalized) {
          const relativePath = file.slice(normalized.length + 1)
          const firstSegment = relativePath.split('/')[0]
          if (firstSegment) {
            entries.add(firstSegment)
          }
        }
      }
      for (const dir of this.dirs) {
        if (dir.startsWith(normalized) && dir !== normalized) {
          const relativePath = dir.slice(normalized.length + 1)
          const firstSegment = relativePath.split('/')[0]
          if (firstSegment) {
            entries.add(firstSegment)
          }
        }
      }
      return Array.from(entries)
    },

    mkdir: async (path: string): Promise<void> => {
      const normalized = this.normalizePath(path)
      this.ensureParentDir(normalized)
      this.dirs.add(normalized)
    },

    rmdir: async (path: string): Promise<void> => {
      const normalized = this.normalizePath(path)
      if (!this.dirs.has(normalized)) {
        throw new Error(`ENOENT: no such file or directory, rmdir '${path}'`)
      }
      // 检查目录是否为空
      for (const file of this.files.keys()) {
        if (file.startsWith(normalized + '/')) {
          throw new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`)
        }
      }
      for (const dir of this.dirs) {
        if (dir.startsWith(normalized + '/')) {
          throw new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`)
        }
      }
      this.dirs.delete(normalized)
    },

    stat: async (path: string): Promise<{ isDirectory: () => boolean }> => {
      const normalized = this.normalizePath(path)
      return {
        isDirectory: () => this.dirs.has(normalized),
      }
    },

    lstat: async (path: string): Promise<{ isFile: () => boolean }> => {
      const normalized = this.normalizePath(path)
      return {
        isFile: () => this.files.has(normalized),
      }
    },
  }

  readFileSync(path: string): Buffer {
    const normalized = this.normalizePath(path)
    const content = this.files.get(normalized)
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`)
    }
    return content
  }

  writeFileSync(path: string, data: Buffer): void {
    const normalized = this.normalizePath(path)
    this.ensureParentDir(normalized)
    this.files.set(normalized, data)
  }

  unlinkSync(path: string): void {
    const normalized = this.normalizePath(path)
    if (!this.files.has(normalized)) {
      throw new Error(`ENOENT: no such file or directory, unlink '${path}'`)
    }
    this.files.delete(normalized)
  }

  readdirSync(path: string): string[] {
    const normalized = this.normalizePath(path)
    if (!this.dirs.has(normalized)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`)
    }
    const entries = new Set<string>()
    for (const file of this.files.keys()) {
      if (file.startsWith(normalized) && file !== normalized) {
        const relativePath = file.slice(normalized.length + 1)
        const firstSegment = relativePath.split('/')[0]
        if (firstSegment) {
          entries.add(firstSegment)
        }
      }
    }
    for (const dir of this.dirs) {
      if (dir.startsWith(normalized) && dir !== normalized) {
        const relativePath = dir.slice(normalized.length + 1)
        const firstSegment = relativePath.split('/')[0]
        if (firstSegment) {
          entries.add(firstSegment)
        }
      }
    }
    return Array.from(entries)
  }

  mkdirSync(path: string): void {
    const normalized = this.normalizePath(path)
    this.ensureParentDir(normalized)
    this.dirs.add(normalized)
  }

  rmdirSync(path: string): void {
    const normalized = this.normalizePath(path)
    if (!this.dirs.has(normalized)) {
      throw new Error(`ENOENT: no such file or directory, rmdir '${path}'`)
    }
    // 检查目录是否为空
    for (const file of this.files.keys()) {
      if (file.startsWith(normalized + '/')) {
        throw new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`)
      }
    }
    for (const dir of this.dirs) {
      if (dir.startsWith(normalized + '/')) {
        throw new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`)
      }
    }
    this.dirs.delete(normalized)
  }

  statSync(path: string): { isDirectory: () => boolean } {
    const normalized = this.normalizePath(path)
    return {
      isDirectory: () => this.dirs.has(normalized),
    }
  }

  lstatSync(path: string): { isFile: () => boolean } {
    const normalized = this.normalizePath(path)
    return {
      isFile: () => this.files.has(normalized),
    }
  }
}

export const createMemoryFS = (): FSAdapter => new MemoryFS() 