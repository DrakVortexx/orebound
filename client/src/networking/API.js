const API_BASE = 'https://orebound-api.onrender.com/api';
const GAME_BASE = 'https://orebound.onrender.com';

class API {
  constructor() {
    this.token = localStorage.getItem('authToken') || null;
    this.ws = null;
    this.wsConnected = false;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      
      // Check if response is OK first
      if (!response.ok) {
        // Try to get error message from response body
        let errorMessage = 'API request failed';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } else {
            const textData = await response.text();
            errorMessage = textData || errorMessage;
          }
        } catch (parseError) {
          // If we can't parse the error, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Try to parse JSON response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        // Return text response if not JSON
        const textData = await response.text();
        return textData;
      }
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth endpoints
  async login(username, password) {
    return this.post('/auth/login', { username, password });
  }

  async register(username, password) {
    return this.post('/auth/register', { username, password });
  }

  async logout() {
    const response = await this.post('/auth/logout');
    this.clearToken();
    return response;
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }

  async databaseHealthCheck() {
    return this.get('/health/database');
  }

  // User data
  async getUserData() {
    return this.get('/user');
  }

  async updateUserData(data) {
    return this.put('/user', data);
  }

  // Game data
  async getGameData() {
    return this.get('/game');
  }

  async updateGameData(data) {
    return this.put('/game', data);
  }

  // Servers
  async getServers() {
    return this.get('/servers');
  }

  async joinServer(serverId) {
    return this.post(`/servers/${serverId}/join`);
  }

  async leaveServer(serverId) {
    return this.post(`/servers/${serverId}/leave`);
  }

  // Leaderboard
  async getLeaderboard() {
    return this.get('/leaderboard');
  }

  // Servers
  async getServers() {
    return this.get('/servers');
  }

  // Activity
  async getActivity() {
    return this.get('/activity');
  }

  // WebSocket connection
  connectWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    const wsUrl = 'wss://orebound-api.onrender.com';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.wsConnected = true;
      console.log('WebSocket connected');
    };

    this.ws.onclose = () => {
      this.wsConnected = false;
      console.log('WebSocket disconnected');
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return this.ws;
  }

  sendWebSocketMessage(type, data) {
    if (this.ws && this.wsConnected) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  onWebSocketMessage(callback) {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          callback(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    }
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.wsConnected = false;
    }
  }
}

export const api = new API();
