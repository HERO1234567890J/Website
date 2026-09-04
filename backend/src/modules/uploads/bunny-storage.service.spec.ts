import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { BunnyStorageService } from './bunny-storage.service.js';

function makeConfig(storageZone = 'test-zone', apiKey = 'test-key', cdnBase = 'https://cdn.example.com') {
  return {
    get: vi.fn((key: string) => {
      if (key === 'bunny.storageZone') return storageZone;
      if (key === 'bunny.storageApiKey') return apiKey;
      if (key === 'bunny.cdnBase') return cdnBase;
      return '';
    }),
  };
}

describe('BunnyStorageService', () => {
  let svc: BunnyStorageService;

  beforeEach(() => {
    svc = new BunnyStorageService(makeConfig() as never);
  });

  describe('signUpload', () => {
    const validParams = {
      folder: 'tours',
      filename: 'cover.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024 * 100, // 100 KB
    };

    it('returns uploadUrl, publicUrl, path, and headers for a valid request', () => {
      const result = svc.signUpload(validParams);

      expect(result.uploadUrl).toContain('storage.bunnycdn.com/test-zone/tours/');
      expect(result.uploadUrl).toContain('cover.jpg');
      expect(result.publicUrl).toContain('https://cdn.example.com/tours/');
      expect(result.headers).toHaveProperty('AccessKey', 'test-key');
      expect(result.headers).toHaveProperty('Content-Type', 'image/jpeg');
      expect(result.path).toMatch(/^tours\/[a-f0-9-]+-cover\.jpg$/);
    });

    it('generates unique paths for the same filename (UUID prefix)', () => {
      const r1 = svc.signUpload(validParams);
      const r2 = svc.signUpload(validParams);
      expect(r1.path).not.toEqual(r2.path);
    });

    it('rejects file size exceeding 10MB', () => {
      expect(() =>
        svc.signUpload({ ...validParams, fileSize: 10 * 1024 * 1024 + 1 }),
      ).toThrow(BadRequestException);
    });

    it('accepts file size exactly at 10MB limit', () => {
      expect(() =>
        svc.signUpload({ ...validParams, fileSize: 10 * 1024 * 1024 }),
      ).not.toThrow();
    });

    it('rejects disallowed mime types', () => {
      expect(() =>
        svc.signUpload({ ...validParams, mimeType: 'application/pdf' }),
      ).toThrow(BadRequestException);

      expect(() =>
        svc.signUpload({ ...validParams, mimeType: 'video/mp4' }),
      ).toThrow(BadRequestException);
    });

    it('accepts all allowed image mime types', () => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
      for (const mime of allowed) {
        expect(() =>
          svc.signUpload({ ...validParams, mimeType: mime }),
        ).not.toThrow();
      }
    });

    it('throws BadRequestException when Bunny is not configured', () => {
      const unconfigured = new BunnyStorageService(makeConfig('', '', '') as never);
      expect(() => unconfigured.signUpload(validParams)).toThrow(BadRequestException);
      expect(() => unconfigured.signUpload(validParams)).toThrow('not configured');
    });

    it('sanitizes filenames with special characters', () => {
      const result = svc.signUpload({ ...validParams, filename: 'my photo (1).jpg' });
      // Should not contain spaces or parentheses in the path
      expect(result.path).not.toMatch(/[() ]/);
      // ( and ) are each replaced with _, producing my_photo_1_.jpg
      expect(result.path).toMatch(/my_photo_1_\.jpg$/);
    });
  });

  describe('isConfigured', () => {
    it('returns true when all config values are set', () => {
      expect(svc.isConfigured()).toBe(true);
    });

    it('returns false when storageZone is empty', () => {
      const partial = new BunnyStorageService(makeConfig('', 'key', 'https://cdn.com') as never);
      expect(partial.isConfigured()).toBe(false);
    });

    it('returns false when apiKey is empty', () => {
      const partial = new BunnyStorageService(makeConfig('zone', '', 'https://cdn.com') as never);
      expect(partial.isConfigured()).toBe(false);
    });

    it('returns false when cdnBase is empty', () => {
      const partial = new BunnyStorageService(makeConfig('zone', 'key', '') as never);
      expect(partial.isConfigured()).toBe(false);
    });
  });
});
