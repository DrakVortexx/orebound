export class MobileControls {
  constructor(playerController) {
    this.playerController = playerController;
    this.isMobile = this.detectMobile();
    this.joystickActive = false;
    this.joystickData = { x: 0, y: 0 };
    this.actionButtons = {};
    
    if (this.isMobile) {
      this.createMobileUI();
      this.setupEventListeners();
    }
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  createMobileUI() {
    // Remove existing mobile controls
    this.removeMobileUI();

    const mobileControls = document.createElement('div');
    mobileControls.className = 'mobile-controls';
    mobileControls.innerHTML = `
      <div class="joystick-container" id="joystickContainer">
        <div class="joystick-base" id="joystickBase">
          <div class="joystick-stick" id="joystickStick"></div>
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="action-btn jump-btn" id="jumpBtn">
          <span class="btn-icon">⬆</span>
        </button>
        <button class="action-btn interact-btn" id="interactBtn">
          <span class="btn-icon">E</span>
        </button>
        <button class="action-btn mine-btn" id="mineBtn">
          <span class="btn-icon">⛏</span>
        </button>
      </div>
    `;

    document.body.appendChild(mobileControls);
  }

  setupEventListeners() {
    const joystickContainer = document.getElementById('joystickContainer');
    const joystickStick = document.getElementById('joystickStick');
    const joystickBase = document.getElementById('joystickBase');

    // Joystick touch events
    joystickContainer.addEventListener('touchstart', (e) => this.handleJoystickStart(e, joystickBase, joystickStick));
    joystickContainer.addEventListener('touchmove', (e) => this.handleJoystickMove(e, joystickBase, joystickStick));
    joystickContainer.addEventListener('touchend', (e) => this.handleJoystickEnd(e, joystickBase, joystickStick));

    // Action buttons
    const jumpBtn = document.getElementById('jumpBtn');
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.playerController.canJump = true;
      this.playerController.velocity.y = this.playerController.jumpForce;
      this.playerController.isGrounded = false;
    });

    const interactBtn = document.getElementById('interactBtn');
    interactBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.playerController.startInteraction();
    });
    interactBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.playerController.cancelInteraction();
    });

    const mineBtn = document.getElementById('mineBtn');
    mineBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.playerController.tryMine();
    });
    mineBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.playerController.stopMining();
    });
  }

  handleJoystickStart(e, base, stick) {
    e.preventDefault();
    this.joystickActive = true;
    
    const touch = e.touches[0];
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    this.joystickCenter = { x: centerX, y: centerY };
    this.updateJoystick(touch.clientX, touch.clientY, base, stick);
  }

  handleJoystickMove(e, base, stick) {
    e.preventDefault();
    if (!this.joystickActive) return;
    
    const touch = e.touches[0];
    this.updateJoystick(touch.clientX, touch.clientY, base, stick);
  }

  handleJoystickEnd(e, base, stick) {
    e.preventDefault();
    this.joystickActive = false;
    this.joystickData = { x: 0, y: 0 };
    
    stick.style.transform = 'translate(0, 0)';
    
    // Reset player movement
    this.playerController.moveForward = false;
    this.playerController.moveBackward = false;
    this.playerController.moveLeft = false;
    this.playerController.moveRight = false;
  }

  updateJoystick(clientX, clientY, base, stick) {
    const maxDistance = 40;
    const deltaX = clientX - this.joystickCenter.x;
    const deltaY = clientY - this.joystickCenter.y;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const clampedDistance = Math.min(distance, maxDistance);
    
    const angle = Math.atan2(deltaY, deltaX);
    const clampedX = Math.cos(angle) * clampedDistance;
    const clampedY = Math.sin(angle) * clampedDistance;
    
    stick.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    
    // Normalize joystick data for player movement
    this.joystickData.x = clampedX / maxDistance;
    this.joystickData.y = clampedY / maxDistance;
    
    // Update player movement based on joystick
    this.playerController.moveForward = this.joystickData.y < -0.2;
    this.playerController.moveBackward = this.joystickData.y > 0.2;
    this.playerController.moveLeft = this.joystickData.x < -0.2;
    this.playerController.moveRight = this.joystickData.x > 0.2;
  }

  removeMobileUI() {
    const existing = document.querySelector('.mobile-controls');
    if (existing) {
      existing.remove();
    }
  }

  destroy() {
    this.removeMobileUI();
  }
}
