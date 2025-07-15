// API layer that works with both server and local storage
import { localStorageManager } from './localStorage';
import { apiRequest } from './queryClient';
import type { Spell, RingStorage, InsertSpell } from "../../shared/schema";

// Detect if we're running in server mode or static mode
const isServerMode = () => {
  // Check if we can reach the server
  return new Promise((resolve) => {
    fetch('/api/health', { method: 'HEAD' })
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
};

export class ApiManager {
  private serverAvailable: boolean | null = null;

  async checkServerAvailability(): Promise<boolean> {
    // Always return false to use local storage only
    return false;
  }

  async getAllSpells(): Promise<Spell[]> {
    return localStorageManager.getAllSpells();
  }

  async createSpells(spells: InsertSpell[]): Promise<Spell[]> {
    // Clear existing spells and add new ones
    localStorageManager.clearSpells();
    const result = localStorageManager.addSpells(spells);
    return result;
  }

  async deleteAllSpells(): Promise<void> {
    localStorageManager.clearSpells();
  }

  async getRingStorage(): Promise<(RingStorage & { spell: Spell })[]> {
    return localStorageManager.getRingStorage();
  }

  async addSpellToRing(spellId: number, upcastLevel: number = 0): Promise<RingStorage> {
    return localStorageManager.addSpellToRing(spellId, upcastLevel);
  }

  async removeSpellFromRing(ringId: number): Promise<void> {
    localStorageManager.removeSpellFromRing(ringId);
  }

  async clearRingStorage(): Promise<void> {
    localStorageManager.clearRingStorage();
  }

  async toggleSpellFavorite(spellId: number): Promise<void> {
    localStorageManager.toggleSpellFavorite(spellId);
  }

  // Local storage only methods
  exportData(): string {
    return localStorageManager.exportData();
  }

  importData(jsonData: string): void {
    return localStorageManager.importData(jsonData);
  }

  getStorageType(): Promise<'server' | 'local'> {
    return this.checkServerAvailability().then(available => 
      available ? 'server' : 'local'
    );
  }
}

export const apiManager = new ApiManager();