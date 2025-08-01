// Mock for @supabase/realtime-js ES module
module.exports = {
  RealtimeClient: class MockRealtimeClient {
    constructor() {
      this.channels = [];
    }
    channel() {
      return {
        on: () => this,
        subscribe: () => this,
        unsubscribe: () => this,
      };
    }
    removeAllChannels() {}
    disconnect() {}
  },
  RealtimeChannel: class MockRealtimeChannel {
    on() { return this; }
    subscribe() { return this; }
    unsubscribe() { return this; }
  },
  REALTIME_LISTEN_TYPES: {
    BROADCAST: 'broadcast',
    PRESENCE: 'presence',
    POSTGRES_CHANGES: 'postgres_changes',
  },
  REALTIME_SUBSCRIBE_STATES: {
    SUBSCRIBED: 'SUBSCRIBED',
    TIMED_OUT: 'TIMED_OUT',
    CLOSED: 'CLOSED',
  },
};