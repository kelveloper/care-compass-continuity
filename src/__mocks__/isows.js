// Mock for isows ES module
module.exports = {
  WebSocket: global.WebSocket || class MockWebSocket {
    constructor() {
      this.readyState = 1;
    }
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  },
  getNativeWebSocket: () => global.WebSocket || class MockWebSocket {
    constructor() {
      this.readyState = 1;
    }
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  },
};