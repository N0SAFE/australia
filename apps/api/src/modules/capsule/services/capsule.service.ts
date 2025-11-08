import { Injectable, NotFoundException } from '@nestjs/common';
import { CapsuleRepository, type CreateCapsuleInput, type UpdateCapsuleInput, type GetCapsulesInput } from '../repositories/capsule.repository';

@Injectable()
export class CapsuleService {
  constructor(private readonly capsuleRepository: CapsuleRepository) {}

  /**
   * Create a new capsule
   */
  async createCapsule(input: CreateCapsuleInput) {
    return await this.capsuleRepository.create(input);
  }

  /**
   * Get capsule by ID
   */
  async getCapsuleById(id: string) {
    const capsule = await this.capsuleRepository.findById(id);
    if (!capsule) {
      throw new NotFoundException(`Capsule with ID ${id} not found`);
    }
    return capsule;
  }

  /**
   * Get capsule by ID (nullable version for update/delete operations)
   */
  async findCapsuleById(id: string) {
    return await this.capsuleRepository.findById(id);
  }

  /**
   * Get all capsules with pagination
   */
  async getCapsules(input: GetCapsulesInput) {
    return await this.capsuleRepository.findMany(input);
  }

  /**
   * Get capsules by day
   */
  async getCapsulesByDay(day: string) {
    const capsules = await this.capsuleRepository.findByDay(day);
    return { capsules };
  }

  /**
   * Get capsules for specified month
   */
  async getCapsulesForMonth(month: string) {
    const capsules = await this.capsuleRepository.findByMonth(month);
    return { capsules };
  }

  /**
   * Update capsule by ID
   */
  async updateCapsule(id: string, input: Omit<UpdateCapsuleInput, "id">) {
    const existingCapsule = await this.capsuleRepository.findById(id);
    if (!existingCapsule) {
      return null;
    }

    return await this.capsuleRepository.update(id, input);
  }

  /**
   * Delete capsule by ID
   */
  async deleteCapsule(id: string) {
    const existingCapsule = await this.capsuleRepository.findById(id);
    if (!existingCapsule) {
      return null;
    }

    return await this.capsuleRepository.delete(id);
  }
}
