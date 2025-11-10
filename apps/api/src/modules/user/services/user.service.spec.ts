import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let mockUserRepository: any;
  let mockAuthRepository: any;

  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    image: null,
    status: 'active',
    emailVerified: false,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    mockUserRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      existsByEmail: vi.fn(),
      getCount: vi.fn(),
    };
    
    mockAuthRepository = {
      api: {adminUpdateUser: vi.fn()},
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserService,
          useFactory: () => new UserService(mockUserRepository, mockAuthRepository),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    
    // Reset mocks
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a new user when email does not exist', async () => {
      const input = { name: 'John Doe', email: 'john@example.com', image: "" };
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await service.createUser(input);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(input.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(input);
    });

    it('should throw ConflictException when user with email already exists', async () => {
      const input = { name: 'John Doe', email: 'john@example.com', image: "" };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.createUser(input)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(input.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById('1');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.getUserById('1')).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findUserById('1');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.findUserById('1');

      expect(result).toBeNull();
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail('john@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const input = { pagination: { limit: 10, offset: 0 } };
      const mockResponse = {
        users: [mockUser],
        meta: { pagination: { total: 1, limit: 10, offset: 0, hasMore: false } },
      };
      mockUserRepository.findMany.mockResolvedValue(mockResponse);

      const result = await service.getUsers(input);

      expect(result).toEqual(mockResponse);
      expect(mockUserRepository.findMany).toHaveBeenCalledWith(input);
    });
  });

  describe('updateUser', () => {
    it('should update user when user exists and no email conflict', async () => {
      const input = { name: 'Jane Doe' };
      const updatedUser = { ...mockUser, name: 'Jane Doe' };
      
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('1', input);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', input);
    });

    it('should return null when user does not exist', async () => {
      const input = { name: 'Jane Doe' };
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.updateUser('1', input);

      expect(result).toBeNull();
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should update user with new email when no conflict', async () => {
      const input = { email: 'jane@example.com' };
      const updatedUser = { ...mockUser, email: 'jane@example.com' };
      
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('1', input);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('jane@example.com');
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', input);
    });

    it('should throw ConflictException when updating to existing email', async () => {
      const input = { email: 'existing@example.com' };
      
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      await expect(service.updateUser('1', input)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('existing@example.com');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should not check email conflict when email is same as current', async () => {
      const input = { email: 'john@example.com', name: 'John Updated' };
      const updatedUser = { ...mockUser, name: 'John Updated' };
      
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('1', input);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.existsByEmail).not.toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', input);
    });
  });

  describe('deleteUser', () => {
    it('should delete user when user exists', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(mockUser);

      const result = await service.deleteUser('1');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
      expect(mockUserRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should return null when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.deleteUser('1');

      expect(result).toBeNull();
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('checkUserExistsByEmail', () => {
    it('should return exists true when user exists', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      const result = await service.checkUserExistsByEmail('john@example.com');

      expect(result).toEqual({ exists: true });
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('john@example.com');
    });

    it('should return exists false when user does not exist', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);

      const result = await service.checkUserExistsByEmail('nonexistent@example.com');

      expect(result).toEqual({ exists: false });
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });
  });

  describe('getUserCount', () => {
    it('should return user count', async () => {
      mockUserRepository.getCount.mockResolvedValue(42);

      const result = await service.getUserCount();

      expect(result).toEqual({ count: 42 });
      expect(mockUserRepository.getCount).toHaveBeenCalledOnce();
    });
  });
});