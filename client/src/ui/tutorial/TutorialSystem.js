import { gameState } from '../../game/GameState.js';
import './tutorial.css';

export class TutorialSystem {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.container = document.body;
    this.steps = this.getTutorialSteps();
  }

  getTutorialSteps() {
    return [
      {
        id: 1,
        title: 'Welcome to OREBOUND',
        description: 'OREBOUND is a multiplayer mining game where you mine ores, sell them, buy generators, and build your empire!',
        position: 'center',
        action: null
      },
      {
        id: 2,
        title: 'Movement',
        description: 'Use WASD or Arrow keys to move around the world. Space to jump.',
        position: 'bottom',
        action: 'move'
      },
      {
        id: 3,
        title: 'Mining Area',
        description: 'The dark rocky area is where you can mine ores. Walk towards it now.',
        position: 'top',
        action: 'goto_mining'
      },
      {
        id: 4,
        title: 'Mining Ores',
        description: 'Click on ores to mine them. Different ores have different values and rarity.',
        position: 'top',
        action: 'mine'
      },
      {
        id: 5,
        title: 'Inventory',
        description: 'Press the Inventory button or check your collected ores. Click it to see your items.',
        position: 'right',
        action: 'open_inventory'
      },
      {
        id: 6,
        title: 'Selling Ores',
        description: 'Visit the Shop to sell your ores for money. The shop is the red building.',
        position: 'top',
        action: 'goto_shop'
      },
      {
        id: 7,
        title: 'Crates',
        description: 'Use ores to purchase crates. Crates contain generators and valuable rewards!',
        position: 'top',
        action: 'buy_crate'
      },
      {
        id: 8,
        title: 'Waiting for Crates',
        description: 'Crates take time to unlock. Wait for the timer, then open them for rewards.',
        position: 'center',
        action: 'wait_crate'
      },
      {
        id: 9,
        title: 'Generators',
        description: 'Generators produce passive income over time. Place them on your plot to earn money automatically.',
        position: 'top',
        action: 'place_generator'
      },
      {
        id: 10,
        title: 'Your Plot',
        description: 'This is your plot. Expand it to fit more generators and increase your income.',
        position: 'top',
        action: 'expand_plot'
      },
      {
        id: 11,
        title: 'Plot Expansion',
        description: 'Visit the shop to expand your plot. Larger plots can hold more generators.',
        position: 'center',
        action: null
      },
      {
        id: 12,
        title: 'BALTOP',
        description: 'Compete with other players to become the richest on the BALTOP leaderboard!',
        position: 'center',
        action: null
      },
      {
        id: 13,
        title: 'Generator Stealing',
        description: 'Watch out! Other players can steal your generators if you\'re not careful. Defend your plot!',
        position: 'center',
        action: null
      },
      {
        id: 14,
        title: 'Trading',
        description: 'Trade with other players to get items you need. Build alliances and dominate together!',
        position: 'center',
        action: null
      },
      {
        id: 15,
        title: 'You\'re Ready!',
        description: 'You now know the basics of OREBOUND. Go forth, mine, build, and become the richest player!',
        position: 'center',
        action: null
      }
    ];
  }

  start() {
    if (gameState.tutorialCompleted) return;
    
    this.isActive = true;
    this.currentStep = 0;
    this.showStep(this.currentStep);
  }

  showStep(stepIndex) {
    if (stepIndex >= this.steps.length) {
      this.complete();
      return;
    }

    const step = this.steps[stepIndex];
    this.renderTutorial(step);
  }

  renderTutorial(step) {
    // Remove existing tutorial
    this.removeTutorial();

    const tutorial = document.createElement('div');
    tutorial.className = 'tutorial-overlay';
    tutorial.innerHTML = `
      <div class="tutorial-content tutorial-${step.position}">
        <div class="tutorial-header">
          <h2>${step.title}</h2>
          <div class="tutorial-progress">
            <span class="progress-text">${step.id} / ${this.steps.length}</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(step.id / this.steps.length) * 100}%"></div>
            </div>
          </div>
        </div>
        <div class="tutorial-body">
          <p>${step.description}</p>
        </div>
        <div class="tutorial-footer">
          <button class="tutorial-btn tutorial-btn-secondary" id="skipBtn">Skip Tutorial</button>
          <button class="tutorial-btn tutorial-btn-primary" id="nextBtn">
            ${step.id === this.steps.length ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(tutorial);

    // Add event listeners
    tutorial.querySelector('#nextBtn').addEventListener('click', () => {
      this.nextStep();
    });

    tutorial.querySelector('#skipBtn').addEventListener('click', () => {
      this.skip();
    });
  }

  nextStep() {
    this.currentStep++;
    gameState.updateTutorialStep(this.currentStep);
    this.showStep(this.currentStep);
  }

  skip() {
    this.complete();
  }

  complete() {
    this.isActive = false;
    this.removeTutorial();
    gameState.tutorialCompleted = true;
    gameState.updateTutorialStep(16);
  }

  removeTutorial() {
    if (!this.container) return;
    const existing = this.container.querySelector('.tutorial-overlay');
    if (existing) {
      existing.remove();
    }
  }

  advanceToCondition(condition) {
    if (!this.isActive) return;

    const currentStepData = this.steps[this.currentStep];
    if (currentStepData.action === condition) {
      this.nextStep();
    }
  }

  destroy() {
    this.removeTutorial();
    this.isActive = false;
  }
}

export const tutorialSystem = new TutorialSystem();
