import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

/**
 * WebSocket Gateway for real-time file processing updates
 * Allows clients to subscribe to processing progress for specific files
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // TODO: Configure based on environment
    credentials: true,
  },
  namespace: '/file-processing',
})
export class FileProcessingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FileProcessingGateway.name);

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Handle subscription to file processing updates
   */
  @SubscribeMessage('subscribe:file')
  handleSubscribeToFile(client: Socket, payload: { fileId: string }) {
    const room = `file:${payload.fileId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);
    
    // Send acknowledgment
    client.emit('subscribed', { fileId: payload.fileId });
  }

  /**
   * Handle unsubscription from file processing updates
   */
  @SubscribeMessage('unsubscribe:file')
  handleUnsubscribeFromFile(client: Socket, payload: { fileId: string }) {
    const room = `file:${payload.fileId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
  }

  /**
   * Emit processing progress update for a specific file
   */
  emitProcessingProgress(fileId: string, data: {
    progress: number;
    status: 'processing' | 'completed' | 'failed';
    message?: string;
    metadata?: any;
  }) {
    const room = `file:${fileId}`;
    this.server.to(room).emit('processing:progress', {
      fileId,
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Emitted progress for ${fileId}: ${data.progress}%`);
  }

  /**
   * Emit processing started event
   */
  emitProcessingStarted(fileId: string, metadata?: any) {
    const room = `file:${fileId}`;
    this.server.to(room).emit('processing:started', {
      fileId,
      metadata,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted processing started for ${fileId}`);
  }

  /**
   * Emit processing completed event
   */
  emitProcessingCompleted(fileId: string, result?: any) {
    const room = `file:${fileId}`;
    this.server.to(room).emit('processing:completed', {
      fileId,
      result,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted processing completed for ${fileId}`);
  }

  /**
   * Emit processing failed event
   */
  emitProcessingFailed(fileId: string, error: string) {
    const room = `file:${fileId}`;
    this.server.to(room).emit('processing:failed', {
      fileId,
      error,
      timestamp: new Date().toISOString(),
    });
    this.logger.error(`Emitted processing failed for ${fileId}: ${error}`);
  }
}
