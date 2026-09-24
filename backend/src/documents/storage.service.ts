import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageService {
  saveFile(buffer: Buffer, originalFilename: string): Promise<string>;
  getFile(filePath: string): Promise<Buffer>;
  deleteFile(filePath: string): Promise<boolean>;
}

@Injectable()
export class LocalStorageService implements StorageService {
  private baseDir: string;

  constructor(private configService: ConfigService) {
    this.baseDir = this.configService.get<string>('storage.path') || './uploads';
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, originalFilename: string): Promise<string> {
    const timestamp = Date.now();
    const safeName = `${timestamp}-${originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const targetPath = path.join(this.baseDir, safeName);
    await fs.promises.writeFile(targetPath, buffer);
    return targetPath;
  }

  async getFile(filePath: string): Promise<Buffer> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    return fs.promises.readFile(filePath);
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return true;
    } catch {
      return false;
    }
  }
}