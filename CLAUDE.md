# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a web-based lane runner game built with vanilla HTML5, CSS, and JavaScript. The player controls a character that moves between lanes to avoid obstacles while auto-running forward.

## Architecture
- **index.html**: Main game HTML structure with canvas element and UI overlay
- **script.js**: Complete game logic implemented as a `LaneRunner` class with game loop, input handling, collision detection, and rendering
- **style.css**: Game styling with dark gradient theme and responsive UI elements
- **17-172003_car-clipart-top-view-birds-eye-view-car.png**: Car sprite asset (referenced but not currently used in rendering)

## Key Game Systems
- **Lane System**: 3-lane gameplay with smooth player movement between lanes
- **Input Handling**: Supports keyboard (A/D keys, arrow keys) and gamepad (left stick, D-pad)
- **Obstacle System**: Spawning, collision detection, and progressive difficulty scaling
- **Animation**: Canvas-based rendering with animated lane lines, player bounce, and obstacle wobble effects
- **Game States**: Playing and game over states with auto-restart functionality

## Development Notes
- All testing is done through Railway deployment, no local dev server
- Game uses `requestAnimationFrame` for smooth 60fps game loop
- Player and obstacles are drawn using canvas 2D context with simple geometric shapes
- Game difficulty increases over time by reducing obstacle spawn rate and increasing speed
- Auto-restart feature triggers 3 seconds after game over

## Controls
- **Keyboard**: A/D keys or arrow keys for lane switching
- **Gamepad**: Left analog stick or D-pad for lane switching
- **Mouse**: Restart button click during game over screen

## Game Logic Flow
1. Player starts in center lane with forward auto-movement
2. Obstacles spawn at random lanes from top of screen
3. Player switches lanes to avoid collisions
4. Score increases as obstacles pass the player
5. Game over triggers on collision, followed by auto-restart