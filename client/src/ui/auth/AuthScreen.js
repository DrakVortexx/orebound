import { gameState } from '../../game/GameState.js';
import { api } from '../../networking/API.js';

export class AuthScreen {
  constructor(container) {
    this.container = container;
    this.currentMode = 'login';
    this.isAuthenticated = false;
    
    // Check if user is already authenticated
    const existingToken = localStorage.getItem('authToken');
    if (existingToken) {
      api.setToken(existingToken);
      this.isAuthenticated = true;
      this.fetchUserData();
      return;
    }
    
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="auth-container">
        <div class="auth-background"></div>
        <div class="auth-content">
          <div class="auth-header">
            <h1 class="auth-title">OREBOUND</h1>
            <p class="auth-subtitle">Mine. Build. Dominate.</p>
          </div>
          
          <div class="auth-form-container">
            <div class="auth-tabs">
              <button class="auth-tab ${this.currentMode === 'login' ? 'active' : ''}" data-mode="login">
                Login
              </button>
              <button class="auth-tab ${this.currentMode === 'signup' ? 'active' : ''}" data-mode="signup">
                Sign Up
              </button>
            </div>

            <form class="auth-form" id="authForm">
              <div class="form-group">
                <label for="username">Username</label>
                <input 
                  type="text" 
                  id="username" 
                  name="username" 
                  required 
                  minlength="3"
                  maxlength="20"
                  placeholder="Enter your username"
                  autocomplete="username"
                >
              </div>

              <div class="form-group">
                <label for="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  required 
                  minlength="6"
                  placeholder="Enter your password"
                  autocomplete="${this.currentMode === 'login' ? 'current-password' : 'new-password'}"
                >
              </div>

              ${this.currentMode === 'signup' ? `
                <div class="form-group">
                  <label for="confirmPassword">Confirm Password</label>
                  <input 
                    type="password" 
                    id="confirmPassword" 
                    name="confirmPassword" 
                    required 
                    minlength="6"
                    placeholder="Confirm your password"
                    autocomplete="new-password"
                  >
                </div>
              ` : ''}

              <button type="submit" class="auth-submit-btn">
                ${this.currentMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            <div class="auth-error" id="authError" style="display: none;"></div>
          </div>

          <div class="auth-footer">
            <p class="auth-terms">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Tab switching
    const tabs = this.container.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        if (mode !== this.currentMode) {
          this.currentMode = mode;
          this.render();
        }
      });
    });

    // Form submission
    const form = this.container.querySelector('#authForm');
    form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const errorElement = this.container.querySelector('#authError');
    const submitBtn = this.container.querySelector('.auth-submit-btn');

    const username = formData.get('username');
    const password = formData.get('password');

    // Validation
    if (this.currentMode === 'signup') {
      const confirmPassword = formData.get('confirmPassword');
      if (password !== confirmPassword) {
        this.showError('Passwords do not match');
        return;
      }
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    errorElement.style.display = 'none';

    try {
      let response;
      if (this.currentMode === 'login') {
        response = await api.login(username, password);
      } else {
        response = await api.register(username, password);
      }

      // Store token
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        api.setToken(response.token);
      }

      // Update game state
      gameState.setUser({
        username: response.username || username,
        id: response.id
      });

      // Dispatch custom event for successful auth
      const authSuccessEvent = new CustomEvent('authSuccess', {
        detail: { user: response }
      });
      window.dispatchEvent(authSuccessEvent);

    } catch (error) {
      this.showError(error.message || 'Authentication failed');
      submitBtn.disabled = false;
      submitBtn.textContent = this.currentMode === 'login' ? 'Login' : 'Create Account';
    }
  }

  showError(message) {
    const errorElement = this.container.querySelector('#authError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  async fetchUserData() {
    try {
      const userData = await api.getUserData();
      if (userData) {
        gameState.setUser({
          username: userData.username,
          id: userData.id
        });
        
        // Dispatch custom event for auto-auth
        const authSuccessEvent = new CustomEvent('authSuccess', {
          detail: { user: userData, autoAuth: true }
        });
        window.dispatchEvent(authSuccessEvent);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // If token is invalid, clear it and show auth screen
      api.clearToken();
      this.isAuthenticated = false;
      this.render();
    }
  }

  destroy() {
    if (!this.isAuthenticated) {
      this.container.innerHTML = '';
    }
  }
}