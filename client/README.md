# OREBOUND Client

A polished multiplayer mining/tycoon game client built with Three.js, featuring a complete game loop from authentication to gameplay.

## Features Implemented

### Core Architecture
- **Game State Management**: Centralized state management for player data, inventory, and game progression
- **Networking Layer**: Clean API abstraction for HTTP and WebSocket communication with the backend
- **Game Configuration**: Centralized configuration for ores, crates, generators, and game balance

### Authentication Flow
- **Login/Signup Screens**: Polished authentication UI with form validation
- **Session Management**: Token-based authentication with automatic handling
- **Error Handling**: User-friendly error messages and feedback

### Dashboard
- **Player Statistics**: Real-time display of money, generators, plot size, and rank
- **Recent Activity**: Activity feed showing recent game actions
- **Settings Panel**: Account, graphics, and audio settings
- **BALTOP Integration**: Leaderboard access and display

### Server Selection
- **Public Servers**: Display of available servers with player counts, status, and ping
- **Random Server**: Quick join functionality
- **Private Server**: Future-ready architecture for private games

### 3D Game World
- **Environment**: Detailed world with grass, rocks, paths, and atmospheric elements
- **Lighting System**: Dynamic lighting with ambient, hemisphere, directional, and point lights
- **Visual Effects**: Clouds, particle systems, and environmental details
- **Optimized Rendering**: Performance-conscious rendering with shadow mapping

### Player Movement
- **Desktop Controls**: WASD/Arrow keys for movement, Space for jump
- **Mobile Controls**: Virtual joystick and action buttons for touch devices
- **Smooth Movement**: Physics-based movement with collision detection

### Mining System
- **Ore Types**: 8 different ore types with varying rarity, value, and appearance
- **Mining Mechanics**: Click-to-mine with health system and visual feedback
- **Particle Effects**: Satisfying particle effects when mining ores
- **Ore Respawn**: Automatic ore respawning in the mining area

### Inventory System
- **Visual Grid**: Clean inventory UI with item icons and quantities
- **Real-time Updates**: Live inventory updates during gameplay
- **Item Categorization**: Organized display of ores, crates, and generators

### Selling System
- **Shop Integration**: Sell ores for money with dynamic pricing
- **Bulk Selling**: Sell individual items or entire inventory
- **Transaction Feedback**: Visual and numerical feedback for transactions

### Crate System
- **Multiple Tiers**: Common, Rare, Epic, and Legendary crates
- **Unlock Timers**: Time-based crate unlocking with progress display
- **Reward System**: Randomized rewards including generators, ores, and money
- **Purchase Requirements**: Ore-based crafting system for crate acquisition

### Generator System
- **Generator Types**: 4 tiers of generators with increasing income rates
- **Placement System**: Physical placement of generators on player plots
- **Visual Effects**: Animated generators with glowing cores and rotating rings
- **Passive Income**: Automatic money generation based on placed generators

### Plot System
- **Plot Management**: Player-specific building areas
- **Expansion System**: Tier-based plot expansion with increasing costs
- **Visual Feedback**: Plot size visualization and border indicators

### Generator Stealing
- **Stealing Mechanics**: Hold-to-steal system with progress indicators
- **Risk/Reward**: Players can steal generators from other players' plots
- **Defense System**: Players can defend their plots from intruders
- **Visual Feedback**: Progress bars and warning indicators

### Game UI
- **HUD System**: Clean heads-up display with player info, money, and quick actions
- **Interaction Prompts**: Context-sensitive interaction indicators
- **Progress Bars**: Visual feedback for timed interactions
- **Notification System**: Toast notifications for game events
- **Menu System**: In-game menu with settings and exit options

### Tutorial System
- **Step-by-Step Guide**: Interactive tutorial covering all game mechanics
- **Progress Tracking**: Tutorial progress saved to game state
- **Skip Option**: Players can skip the tutorial if desired
- **Contextual Prompts**: Tutorial steps tied to game actions

### BALTOP Leaderboard
- **Leaderboard Display**: Top players with podium visualization
- **Rank System**: Player ranking with current user highlighting
- **Real-time Updates**: Dynamic leaderboard updates
- **Visual Polish**: Animated podium and ranking display

### Mobile Support
- **Responsive Design**: UI adapts to different screen sizes
- **Touch Controls**: Virtual joystick and action buttons
- **Mobile-Optimized UI**: Simplified controls for mobile devices
- **Performance**: Optimized for mobile hardware

### Visual Polish
- **Animations**: Smooth animations throughout the UI and game world
- **Lighting Effects**: Dynamic lighting with emissive materials
- **Particle Systems**: Visual feedback for interactions
- **Material Quality**: High-quality materials with proper roughness and metalness
- **Environmental Details**: Grass, rocks, clouds, and paths for immersion

### Performance Optimization
- **Particle Pooling**: Limited particle count with automatic cleanup
- **Memory Management**: Proper disposal of geometries and materials
- **Efficient Rendering**: Optimized render loop with delta time
- **Resource Cleanup**: Comprehensive cleanup on game exit

## Technical Stack

- **Three.js**: 3D rendering and game world
- **Vite**: Build tool and development server
- **Vanilla JavaScript**: No framework dependencies
- **CSS3**: Modern styling with animations and effects
- **WebSocket**: Real-time multiplayer communication
- **Fetch API**: HTTP communication with backend

## Project Structure

```
client/
├── src/
│   ├── game/
│   │   ├── Game.js                    # Main game controller
│   │   ├── GameEngine.js              # 3D rendering engine
│   │   ├── GameState.js              # State management
│   │   ├── GameConfig.js             # Game configuration
│   │   ├── world/                    # World systems
│   │   ├── mining/                   # Mining systems
│   │   ├── plots/                    # Plot management
│   │   ├── generators/               # Generator systems
│   │   ├── crates/                   # Crate systems
│   │   ├── inventory/                # Inventory management
│   │   ├── trading/                  # Trading systems
│   │   ├── stealing/                 # Stealing mechanics
│   │   └── player/                   # Player controller
│   ├── ui/
│   │   ├── auth/                     # Authentication screens
│   │   ├── dashboard/                # Dashboard UI
│   │   ├── servers/                  # Server selection
│   │   ├── shop/                     # Shop interface
│   │   ├── inventory/                # Inventory UI
│   │   ├── leaderboard/              # Leaderboard display
│   │   ├── tutorial/                 # Tutorial system
│   │   ├── settings/                 # Settings panels
│   │   └── GameUI.js                 # In-game UI
│   ├── networking/
│   │   └── API.js                    # Backend communication
│   ├── utils/                        # Utility functions
│   ├── main.js                       # Application entry point
│   └── style.css                     # Global styles
├── public/                           # Static assets
├── package.json                      # Dependencies
└── index.html                        # HTML template
```

## Development

### Running the Development Server

```bash
cd client
npm install
npm run dev
```

The development server will start on `http://localhost:5173`.

### Building for Production

```bash
cd client
npm run build
```

The production build will be created in the `dist/` directory.

## Backend Integration

The client is designed to connect to the existing backend at `https://orebound-api.onrender.com`. The networking layer provides clean abstractions for:

- HTTP API calls
- WebSocket communication
- Authentication handling
- Error management

## Future Enhancements

The following features are architected but not yet fully implemented:

- **Trading System**: Player-to-player trading interface
- **Defense System**: Enhanced base defense mechanics
- **Private Servers**: Full private server implementation
- **Advanced Tutorial**: More interactive tutorial steps

## Design Philosophy

The OREBOUND client follows these design principles:

1. **Game-First Approach**: Feels like a real game, not a website
2. **Visual Polish**: High-quality graphics and animations
3. **Responsive Design**: Works on desktop, tablet, and mobile
4. **Performance**: Optimized for smooth gameplay
5. **Clean Architecture**: Separated concerns and maintainable code
6. **User Experience**: Intuitive controls and feedback

## Credits

Developed as a multiplayer mining/tycoon game with focus on:
- Addictive gameplay loops
- Social interaction
- Competitive progression
- Risk/reward mechanics
- Long-term engagement
