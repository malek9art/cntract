/**
 * Abu Hudhayfah Exchange & Transfers - Global Store & Event Bus
 */

class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, payload) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }
}

export const events = new EventBus();

export const state = {
  currentView: 'dashboard',
  selectedEmployeeId: null,
  selectedContractId: null,
  selectedVehicleId: null,
  globalSearchQuery: '',
  currentUser: {
    id: 'USR-01',
    name: 'مدير النظام (أبو حذيفة)',
    role: 'مدير عام / مسؤول النظام',
    avatar: null
  },
  systemSettings: null,
  expiringContractsCount: 0
};
