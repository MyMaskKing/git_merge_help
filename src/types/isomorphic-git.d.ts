import * as git from 'isomorphic-git'
import { FSAdapter } from '../lib/git/fs-adapter'

declare module 'isomorphic-git' {
  import { FSAdapter } from '../lib/git/fs-adapter'

  export interface ProgressEvent {
    phase?: string
    loaded: number
    total: number
  }

  export type ProgressCallback = (progress: ProgressEvent) => void
  export type MessageCallback = (message: string) => void
  export type PhaseCallback = (phase: string) => void

  export interface CloneOptions {
    fs: FSAdapter
    http: any
    dir: string
    url: string
    corsProxy?: string
    singleBranch?: boolean
    depth?: number
    onProgress?: ProgressCallback
    onMessage?: MessageCallback
    onPhase?: PhaseCallback
    onAuth?: () => { username: string }
  }

  export interface MergeResult {
    oid?: string
    alreadyMerged?: boolean
    fastForward?: boolean
    mergeCommit?: string
    conflicts?: { [key: string]: any }
  }

  export interface ReadTreeResult {
    oid: string
    [Symbol.iterator](): Iterator<any>
    entries(): Array<{ path: string; oid: string; mode: string }>
  }

  export interface WalkEntry {
    filepath: string
    trees: Array<{ mode: string; oid: string; path: string } | null>
  }

  export interface PushOptions {
    fs: FSAdapter
    http: any
    dir: string
    url?: string
    corsProxy?: string
    onAuth?: () => { username: string }
    remote?: string
    ref?: string
  }

  export interface PullOptions {
    fs: FSAdapter
    http: any
    dir: string
    url?: string
    corsProxy?: string
    ref?: string
    singleBranch?: boolean
    author?: {
      name: string
      email: string
    }
    onAuth?: () => { username: string }
  }

  // 文件状态矩阵中的索引常量
  export enum StatusIndex {
    FILE_PATH = 0,   // 文件路径
    HEAD_STATUS = 1, // HEAD中的状态
    WORKDIR_STATUS = 2, // 工作目录中的状态
    STAGE_STATUS = 3, // 暂存区中的状态
  }

  export function clone(options: CloneOptions): Promise<void>
  export function init(options: { fs: FSAdapter; dir: string }): Promise<void>
  export function currentBranch(options: { fs: FSAdapter; dir: string }): Promise<string | undefined>
  export function listBranches(options: { fs: FSAdapter; dir: string; remote?: string }): Promise<string[]>
  export function checkout(options: { fs: FSAdapter; dir: string; ref: string }): Promise<void>
  export function resolveRef(options: { fs: FSAdapter; dir: string; ref: string }): Promise<string>
  export function merge(options: {
    fs: FSAdapter
    dir: string
    ours?: string
    theirs?: string
    author?: { name: string; email: string }
    dryRun?: boolean
  }): Promise<MergeResult>
  export function readTree(options: { fs: FSAdapter; dir: string; oid: string }): Promise<ReadTreeResult>
  export function walk(options: {
    fs: FSAdapter
    dir: string
    trees: ReadTreeResult[]
    map: (filepath: string, trees: Array<{ mode: string; oid: string } | null>) => Promise<void>
  }): Promise<void>
  export function add(options: { fs: FSAdapter; dir: string; filepath: string }): Promise<void>
  export function commit(options: {
    fs: FSAdapter
    dir: string
    message: string
    author: { name: string; email: string }
  }): Promise<string>
  export function push(options: PushOptions): Promise<void>
  export function pull(options: PullOptions): Promise<void>
  
  // 状态矩阵返回的是一个二维数组，第一个元素是文件路径，后面三个元素是数字，表示文件状态
  export function statusMatrix(args: {
    fs: FSAdapter
    dir: string
  }): Promise<Array<[string, number, number, number]>>
  
  export function readFile(args: {
    fs: FSAdapter
    dir: string
    filepath: string
  }): Promise<string | Uint8Array>
} 