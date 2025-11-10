import { Api } from '@/lib/api';
import type { LockConfig } from '@/types/capsule';

export class Capsule {
  constructor(public readonly client: Api) {}

  async all() {
    return await fetch(`${this.client.url}/capsules`, {
      method: 'GET',
    })
  }

  async findByCurrentMonth() {
    return await fetch(`${this.client.url}/capsules/month`, {
      method: 'GET',
    })
  }

  async findByDay(day: string) {
    return await fetch(`${this.client.url}/capsules/day/${day}`, {
      method: 'GET',
    })
  }

  async findById(id: string) {
    return await fetch(`${this.client.url}/capsules/${id}`, {
      method: 'GET',
    })
  }

  async unlock(id: string, unlockData: LockConfig) {
    return await fetch(`${this.client.url}/capsules/${id}/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.client.token && { Authorization: `Bearer ${this.client.token}` }),
      },
      body: JSON.stringify(unlockData),
    })
  }
}