// Local storage utilities for offline/static hosting
import type { Spell, RingStorage } from "../../../shared/schema";

const STORAGE_KEYS = {
  SPELLS: 'dnd-spells',
  RING_STORAGE: 'dnd-ring-storage',
  NEXT_SPELL_ID: 'dnd-next-spell-id',
  NEXT_RING_ID: 'dnd-next-ring-id'
};

export class LocalStorageManager {
  // Spell management
  getAllSpells(): Spell[] {
    const stored = localStorage.getItem(STORAGE_KEYS.SPELLS);
    return stored ? JSON.parse(stored) : [];
  }

  saveSpells(spells: Spell[]): void {
    localStorage.setItem(STORAGE_KEYS.SPELLS, JSON.stringify(spells));
  }

  addSpells(newSpells: Omit<Spell, 'id'>[]): Spell[] {
    // Group spells by name and combine classes
    const spellMap = new Map();
    
    // First, add existing spells to the map
    const existingSpells = this.getAllSpells();
    existingSpells.forEach(spell => {
      spellMap.set(spell.name, spell);
    });
    
    let nextId = this.getNextSpellId();
    
    // Process new spells
    newSpells.forEach(newSpell => {
      if (spellMap.has(newSpell.name)) {
        // Add new classes to existing spell
        const existingSpell = spellMap.get(newSpell.name);
        const existingClasses = existingSpell.class.split(',').map((c: string) => c.trim());
        const newClasses = newSpell.class.split(',').map((c: string) => c.trim());
        const allClasses = [...new Set([...existingClasses, ...newClasses])];
        existingSpell.class = allClasses.join(', ');
      } else {
        // Create new spell entry
        spellMap.set(newSpell.name, {
          ...newSpell,
          id: nextId++,
          isFavorite: false
        });
      }
    });
    
    const allSpells = Array.from(spellMap.values());
    this.saveSpells(allSpells);
    this.setNextSpellId(nextId);
    
    // Return only the newly added spells
    const addedSpells = Array.from(spellMap.values()).filter(spell => 
      newSpells.some(newSpell => newSpell.name === spell.name)
    );
    
    return addedSpells;
  }

  clearSpells(): void {
    localStorage.removeItem(STORAGE_KEYS.SPELLS);
    localStorage.removeItem(STORAGE_KEYS.NEXT_SPELL_ID);
  }

  // Ring storage management
  getRingStorage(): (RingStorage & { spell: Spell })[] {
    const stored = localStorage.getItem(STORAGE_KEYS.RING_STORAGE);
    const ringItems: RingStorage[] = stored ? JSON.parse(stored) : [];
    const spells = this.getAllSpells();
    
    return ringItems.map(item => {
      const spell = spells.find(s => s.id === item.spellId);
      return {
        ...item,
        spell: spell!
      };
    }).filter(item => item.spell); // Filter out items where spell was deleted
  }

  addSpellToRing(spellId: number, upcastLevel: number = 0): RingStorage {
    const existingRing = this.getRingStorageRaw();
    const nextId = this.getNextRingId();
    
    const newItem: RingStorage = {
      id: nextId,
      spellId,
      upcastLevel,
      addedAt: new Date().toISOString()
    };
    
    const updatedRing = [...existingRing, newItem];
    this.saveRingStorage(updatedRing);
    this.setNextRingId(nextId + 1);
    
    return newItem;
  }

  removeSpellFromRing(ringId: number): void {
    const existingRing = this.getRingStorageRaw();
    const updatedRing = existingRing.filter(item => item.id !== ringId);
    this.saveRingStorage(updatedRing);
  }

  clearRingStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.RING_STORAGE);
    localStorage.removeItem(STORAGE_KEYS.NEXT_RING_ID);
  }

  // Private helpers
  private getRingStorageRaw(): RingStorage[] {
    const stored = localStorage.getItem(STORAGE_KEYS.RING_STORAGE);
    return stored ? JSON.parse(stored) : [];
  }

  private saveRingStorage(ringStorage: RingStorage[]): void {
    localStorage.setItem(STORAGE_KEYS.RING_STORAGE, JSON.stringify(ringStorage));
  }

  private getNextSpellId(): number {
    const stored = localStorage.getItem(STORAGE_KEYS.NEXT_SPELL_ID);
    return stored ? parseInt(stored) : 1;
  }

  private setNextSpellId(id: number): void {
    localStorage.setItem(STORAGE_KEYS.NEXT_SPELL_ID, id.toString());
  }

  private getNextRingId(): number {
    const stored = localStorage.getItem(STORAGE_KEYS.NEXT_RING_ID);
    return stored ? parseInt(stored) : 1;
  }

  private setNextRingId(id: number): void {
    localStorage.setItem(STORAGE_KEYS.NEXT_RING_ID, id.toString());
  }

  // Favorite management
  toggleSpellFavorite(spellId: number): void {
    const spells = this.getAllSpells();
    const updatedSpells = spells.map(spell => 
      spell.id === spellId 
        ? { ...spell, isFavorite: !spell.isFavorite }
        : spell
    );
    this.saveSpells(updatedSpells);
  }

  // Utility methods
  exportData(): string {
    return JSON.stringify({
      spells: this.getAllSpells(),
      ringStorage: this.getRingStorageRaw(),
      nextSpellId: this.getNextSpellId(),
      nextRingId: this.getNextRingId()
    }, null, 2);
  }

  importData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      if (data.spells) this.saveSpells(data.spells);
      if (data.ringStorage) this.saveRingStorage(data.ringStorage);
      if (data.nextSpellId) this.setNextSpellId(data.nextSpellId);
      if (data.nextRingId) this.setNextRingId(data.nextRingId);
    } catch (error) {
      throw new Error('Invalid data format');
    }
  }
}

export const localStorageManager = new LocalStorageManager();