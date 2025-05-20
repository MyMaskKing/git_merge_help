declare module '@isomorphic-git/lightning-fs' {
  import { Buffer } from 'buffer';

  export default class FS {
    constructor(name: string);
    promises: {
      readFile: (path: string, options?: { encoding?: string } | string) => Promise<Buffer | string>;
      writeFile: (path: string, data: string | Buffer) => Promise<void>;
      mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
      readdir: (path: string) => Promise<string[]>;
      stat: (path: string) => Promise<{ isDirectory: () => boolean }>;
      lstat: (path: string) => Promise<{ isFile: () => boolean }>;
      unlink: (path: string) => Promise<void>;
      rmdir: (path: string) => Promise<void>;
    };
    readFileSync: (path: string, options?: { encoding?: string } | string) => Buffer | string;
    writeFileSync: (path: string, data: string | Buffer) => void;
    unlinkSync: (path: string) => void;
    readdirSync: (path: string) => string[];
    mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
    rmdirSync: (path: string) => void;
    statSync: (path: string) => { isDirectory: () => boolean };
    lstatSync: (path: string) => { isFile: () => boolean };
  }
} 