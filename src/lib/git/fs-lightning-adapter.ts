import { Buffer } from 'buffer';
import { FSAdapter } from './fs-adapter';
import FS from '@isomorphic-git/lightning-fs';
import { createMemoryFS } from './fs-adapter';

/**
 * 适配器类，将LightningFS适配为符合FSAdapter接口的对象
 */
export class LightningFSAdapter implements FSAdapter {
  private fs: FS;
  private initialized: boolean = false;

  constructor(name: string) {
    try {
      console.log('初始化LightningFS...');
      if (typeof window === 'undefined') {
        throw new Error('LightningFS只能在浏览器环境中使用');
      }
      if (!name) {
        throw new Error('必须提供文件系统名称');
      }
      this.fs = new FS(name);
      this.initialized = true;
      console.log('LightningFS初始化成功');
    } catch (error) {
      console.error('LightningFS初始化失败:', error);
      throw error;
    }
  }

  private ensureInitialized() {
    if (!this.initialized) {
      throw new Error('LightningFS未正确初始化');
    }
  }

  get promises() {
    this.ensureInitialized();
    return {
      readFile: async (path: string): Promise<Buffer> => {
        try {
          const result = await this.fs.promises.readFile(path, { encoding: 'buffer' }) as Buffer | Uint8Array | string;
          if (Buffer.isBuffer(result)) {
            return result;
          } else if (typeof result === 'string') {
            return Buffer.from(result);
          } else {
            // Uint8Array
            return Buffer.from(result);
          }
        } catch (error) {
          console.error(`读取文件失败 (${path}):`, error);
          throw error;
        }
      },

      writeFile: async (path: string, data: Buffer): Promise<void> => {
        try {
          await this.fs.promises.writeFile(path, data);
        } catch (error) {
          console.error(`写入文件失败 (${path}):`, error);
          throw error;
        }
      },

      unlink: async (path: string): Promise<void> => {
        await this.fs.promises.unlink(path);
      },

      readdir: async (path: string): Promise<string[]> => {
        return await this.fs.promises.readdir(path);
      },

      mkdir: async (path: string): Promise<void> => {
        // LightningFS的mkdir可能不支持recursive选项，简单地调用mkdir
        await this.fs.promises.mkdir(path);
      },

      rmdir: async (path: string): Promise<void> => {
        await this.fs.promises.rmdir(path);
      },

      stat: async (path: string): Promise<{ isDirectory: () => boolean }> => {
        const stat = await this.fs.promises.stat(path);
        return {
          isDirectory: () => stat && typeof stat.isDirectory === 'function' && stat.isDirectory(),
        };
      },

      lstat: async (path: string): Promise<{ isFile: () => boolean }> => {
        const stat = await this.fs.promises.lstat(path);
        return {
          isFile: () => stat && typeof stat.isFile === 'function' && stat.isFile(),
        };
      },
    };
  }

  readFileSync(path: string): Buffer {
    // LightningFS 实际上没有同步API，但我们需要实现它来满足FSAdapter接口
    throw new Error('LightningFS不支持同步API，请使用promises.readFile');
  }

  writeFileSync(path: string, data: Buffer): void {
    throw new Error('LightningFS不支持同步API，请使用promises.writeFile');
  }

  unlinkSync(path: string): void {
    throw new Error('LightningFS不支持同步API，请使用promises.unlink');
  }

  readdirSync(path: string): string[] {
    throw new Error('LightningFS不支持同步API，请使用promises.readdir');
  }

  mkdirSync(path: string): void {
    throw new Error('LightningFS不支持同步API，请使用promises.mkdir');
  }

  rmdirSync(path: string): void {
    throw new Error('LightningFS不支持同步API，请使用promises.rmdir');
  }

  statSync(path: string): { isDirectory: () => boolean } {
    throw new Error('LightningFS不支持同步API，请使用promises.stat');
  }

  lstatSync(path: string): { isFile: () => boolean } {
    throw new Error('LightningFS不支持同步API，请使用promises.lstat');
  }

  /**
   * 获取原始的LightningFS实例
   */
  getNativeFS(): FS {
    this.ensureInitialized();
    return this.fs;
  }
}

// 创建一个LightningFS适配器实例
export const createLightningFSAdapter = (name: string): FSAdapter => {
  try {
    console.log('创建文件系统适配器...');
    // 在服务器端使用内存文件系统
    if (typeof window === 'undefined') {
      console.log('服务器端环境，使用内存文件系统');
      return createMemoryFS();
    }
    console.log('客户端环境，使用LightningFS');
    return new LightningFSAdapter(name);
  } catch (error) {
    console.error('创建文件系统适配器失败:', error);
    throw error;
  }
}; 