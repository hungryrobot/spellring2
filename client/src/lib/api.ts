// API layer that works with both server and local storage
import { localStorageManager } from './localStorage';
import { apiRequest } from './queryClient';
import type { Spell, RingStorage, InsertSpell } from "@shared/schema";

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
    if (this.serverAvailable !== null) {
      return this.serverAvailable;
    }
    
    try {
      // Try Netlify functions first
      const netlifyResponse = await fetch('/.netlify/functions/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (netlifyResponse.ok) {
        this.serverAvailable = true;
        return true;
      }
      
      // Fallback to Express server
      const expressResponse = await fetch('/api/health', {
        method: 'HEAD',
        headers: { 'Accept': 'application/json' }
      });
      
      this.serverAvailable = expressResponse.ok;
      return this.serverAvailable;
    } catch (error) {
      this.serverAvailable = false;
      return false;
    }
  }

  async getAllSpells(): Promise<Spell[]> {
    const serverAvailable = await this.checkServerAvailability();
    
    if (serverAvailable) {
      try {
        // Try Netlify functions first
        let response;
        try {
          response = await fetch('/.netlify/functions/spells');
        } catch {
          // Fallback to Express server
          response = await apiRequest('GET', '/api/spells');
        }
        return await response.json();
      } catch {
        // Fallback to local storage if server fails
        return localStorageManager.getAllSpells();
      }
    }
    
    return localStorageManager.getAllSpells();
  }

  async createSpells(spells: InsertSpell[]): Promise<Spell[]> {
    const serverAvailable = await this.checkServerAvailability();
    
    if (serverAvailable) {
      try {
        // Try Netlify functions first
        let response;
        try {
          console.log('Attempting to upload', spells.length, 'spells to Netlify function');
          console.log('Sample spell data:', spells[0]);
          response = await fetch('/.netlify/functions/simple-spells', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(spells)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Netlify function error:', response.status, errorText);
            console.error('Request payload sample:', JSON.stringify(spells.slice(0, 2), null, 2));
            throw new Error(`Netlify function failed: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log('Successfully uploaded to database:', result.length, 'spells');
          return result;
        } catch (error) {
          console.error('Netlify function failed, trying Express server:', error);
          // Fallback to Express server
          response = await apiRequest('POST', '/api/spells/bulk', { spells });
          return await response.json();
        }
      } catch (error) {
        console.error('All server methods failed, using local storage:', error);
        // Fallback to local storage if all server methods fail
        return localStorageManager.addSpells(spells);
      }
    }
    
    console.log('Server not available, using local storage');
    return localStorageManager.addSpells(spells);
  }

  async deleteAllSpells(): Promise<void> {
    const serverAvailable = await this.checkServerAvailability();
    
    if (serverAvailable) {
      try {
        // Try Netlify functions first
        try {
          await fetch('/.netlify/functions/spells?action=clear', { method: 'DELETE' });
        } catch {
          // Fallback to Express server
          await apiRequest('DELETE', '/api/spells');
        }
      } catch {
        // Fallback to local storage if server fails
        localStorageManager.clearSpells();
        return;
      }
    }
    
    localStorageManager.clearSpells();
  }

  async getRingStorage(): Promise<(RingStorage & { spell: Spell })[]> {
    const serverAvailable = await this.checkServerAvailability();
    
    if (serverAvailable) {
      try {
        // Try Netlify functions first
        let response;
        try {
          response = await fetch('/.netlify/functions/ring');
        } catch {
          // Fallback to Express server
          response = await apiRequest('GET', '/api/ring');
        }
        return await response.json();
      } catch {
        // Fallback to local storage if server fails
        return localStorageManager.getRingStorage();
      }
    }
    
    return localStorageManager.getRingStorage();
  }

  async addSpellToRing(spellId: number, upcastLevel: number = 0): Promise<RingStorage> {
    const serverAvailable = await this.checkServerAvailability();
    
    if (serverAvailable) {
      try {
        // Try Netlify functions first
        let response;
        try {
          response = await fetch('/.netlify/functions/ring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spellId, upcastLevel })
          });
        } catch {
          // Fallback to Express server
          response = await apiRequest('POST', '/api/ring', { spellId, upcastLevel });
        }
        return await response.json();
      } catch {
        // Fallback to local storage if server fails
        return localStorageManager.addSpellToRing(spellId, upcastLevel);
      }
    }
    
    return localStorageManager.addSpellToRing(spellId, upcastLevel);
  }

  async removeSpellFromRing(ringId: number): Promise<void> {
    const serverAvailable = await this.checkServerAvailability();
    
    if (serverAvailable) {
      try {
        // Try Netlify functions first
        try {
          await fetch(`/.netlify/functions/ring?id=${ringId}`, { method: 'DELETE' });
        } catch {
          // Fallback to Express server
          await apiRequest('DELETE', `/api/ring/${ringId}`);
        }
      } catch {
        // Fallback to local storage if server fails
        localStorageManager.removeSpellFromRing(ringId);
        return;
      }
    }
    
    localStorageManager.removeSpellFromRing(ringId);
  }

  async clearRingStorage(): Promise<void> {
    const serverAvailable = await this.checkServerAvailability();
    
    if (serverAvailable) {
      try {
        // Try Netlify functions first
        try {
          await fetch('/.netlify/functions/ring?action=clear', { method: 'DELETE' });
        } catch {
          // Fallback to Express server
          await apiRequest('DELETE', '/api/ring');
        }
      } catch {
        // Fallback to local storage if server fails
        localStorageManager.clearRingStorage();
        return;
      }
    }
    
    localStorageManager.clearRingStorage();
  }

  async toggleSpellFavorite(spellId: number): Promise<void> {
    const serverAvailable = await this.checkServerAvailability();
    
    if (serverAvailable) {
      try {
        // Try Netlify functions first
        try {
          await fetch(`/.netlify/functions/spells-favorite?id=${spellId}`, { method: 'POST' });
        } catch {
          // Fallback to Express server
          await apiRequest('PATCH', `/api/spells/${spellId}/favorite`);
        }
      } catch {
        // Fallback to local storage if server fails
        localStorageManager.toggleSpellFavorite(spellId);
        return;
      }
    } else {
      localStorageManager.toggleSpellFavorite(spellId);
    }
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