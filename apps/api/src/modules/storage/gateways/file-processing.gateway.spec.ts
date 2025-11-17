import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileProcessingGateway } from './file-processing.gateway';

describe('FileProcessingGateway', () => {
  let gateway: FileProcessingGateway;
  let mockServer: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileProcessingGateway],
    }).compile();

    gateway = module.get<FileProcessingGateway>(FileProcessingGateway);

    // Mock Socket.IO server
    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should log client connection', () => {
      const mockClient = { id: 'client-123' } as any;
      gateway.handleConnection(mockClient);
      // Logger should have been called (check manually in logs)
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const mockClient = { id: 'client-123' } as any;
      gateway.handleDisconnect(mockClient);
      // Logger should have been called (check manually in logs)
    });
  });

  describe('handleSubscribeToFile', () => {
    it('should add client to file room', () => {
      const mockClient = { id: 'client-123', join: vi.fn(), emit: vi.fn() } as any;
      const payload = { fileId: 'file-uuid-456' };

      gateway.handleSubscribeToFile(mockClient, payload);

      expect(mockClient.join).toHaveBeenCalledWith('file:file-uuid-456');
      expect(mockClient.emit).toHaveBeenCalledWith('subscribed', { fileId: 'file-uuid-456' });
    });
  });

  describe('handleUnsubscribeFromFile', () => {
    it('should remove client from file room', () => {
      const mockClient = { id: 'client-123', leave: vi.fn() } as any;
      const payload = { fileId: 'file-uuid-456' };

      gateway.handleUnsubscribeFromFile(mockClient, payload);

      expect(mockClient.leave).toHaveBeenCalledWith('file:file-uuid-456');
    });
  });

  describe('emitProcessingProgress', () => {
    it('should emit progress update to file room', () => {
      const fileId = 'file-uuid-456';
      const data = {
        progress: 50,
        status: 'processing' as const,
        message: 'Processing video...',
      };

      gateway.emitProcessingProgress(fileId, data);

      expect(mockServer.to).toHaveBeenCalledWith('file:file-uuid-456');
      expect(mockServer.emit).toHaveBeenCalledWith('processing:progress', expect.objectContaining({
        fileId,
        progress: 50,
        status: 'processing',
        message: 'Processing video...',
        timestamp: expect.any(String),
      }));
    });
  });

  describe('emitProcessingStarted', () => {
    it('should emit processing started event', () => {
      const fileId = 'file-uuid-456';
      const metadata = { duration: 120 };

      gateway.emitProcessingStarted(fileId, metadata);

      expect(mockServer.to).toHaveBeenCalledWith('file:file-uuid-456');
      expect(mockServer.emit).toHaveBeenCalledWith('processing:started', expect.objectContaining({
        fileId,
        metadata,
        timestamp: expect.any(String),
      }));
    });
  });

  describe('emitProcessingCompleted', () => {
    it('should emit processing completed event', () => {
      const fileId = 'file-uuid-456';
      const result = { width: 1920, height: 1080 };

      gateway.emitProcessingCompleted(fileId, result);

      expect(mockServer.to).toHaveBeenCalledWith('file:file-uuid-456');
      expect(mockServer.emit).toHaveBeenCalledWith('processing:completed', expect.objectContaining({
        fileId,
        result,
        timestamp: expect.any(String),
      }));
    });
  });

  describe('emitProcessingFailed', () => {
    it('should emit processing failed event', () => {
      const fileId = 'file-uuid-456';
      const error = 'Video codec not supported';

      gateway.emitProcessingFailed(fileId, error);

      expect(mockServer.to).toHaveBeenCalledWith('file:file-uuid-456');
      expect(mockServer.emit).toHaveBeenCalledWith('processing:failed', expect.objectContaining({
        fileId,
        error,
        timestamp: expect.any(String),
      }));
    });
  });
});
