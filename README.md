# ARC LEAGUE ⚡

> **A high-velocity, cyberpunk athletic disc-combat sport set within the Sub-Strata.**  
> Built with Three.js, WebGL, Web Audio, and WebRTC.

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![Platform: Web & Windows Desktop](https://img.shields.io/badge/Platform-Web%20%7C%20Windows%20Desktop-ff007f.svg)](package.json)
[![Status: Active Development](https://img.shields.io/badge/Status-Active%20Development-00ff66.svg)](#)

---

## 🎮 Overview

**Arc League** is a competitive 3D sports-combat arena game where digitized athletes compete in the **Arcfield**, launching high-velocity **Kinetic Discs** governed by realistic aerodynamics, Magnus curve deflection, and ricochet physics. 

Deflect hostile volleys with your energy shield, shatter the arena floor beneath your opponents' feet, and climb the ranks of the **League Circuit**.

Read the full in-universe lore in [LORE.md](LORE.md).

---

## 🌟 Key Features

- **Aerodynamic Kinetic Discs**: Realistic Euler physics simulation featuring lateral Magnus curving, angular spin, surface friction, and multi-surface ricochet restitution.
- **Destructible Stadium Arena**: Dynamic grid tiles flash warning indicators and drop into the digital abyss upon repeated kinetic impacts.
- **28-Stage Campaign Circuit**: 4 distinct sectors escalating into intense **Arbiter Boss** encounters with regenerating multi-layer energy shields.
- **Endless Vectorfall Swarm**: High-stakes survival wave defense against escalating corrupt AI subroutines.
- **Outfitting & Armory**: 3D turntable preview bay with customizable Kinetic Discs, Athlete Rigs, and Stadium Arena cosmetics powered by procedural WebGL shaders.
- **Trophy Matrix & Arc Credits**: Rich progression economy with persistent local storage, cross-device Supabase cloud sync, and 6 core launch achievements.
- **Zero-Cost Peer-to-Peer Multiplayer**: Low-latency 1v1 and 2v2 Duels powered by WebRTC DataChannels with warm-up AI bot sparring while in the matchmaking queue.
- **Procedural Synthesizer Audio**: 100% code-synthesized retro chimes, laser sweeps, parry deflections, and ambient stadium hums via the Web Audio API—zero external MP3/WAV assets needed.

---

## 🚀 Quick Start (Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### Installation
```bash
# Clone repository
git clone https://github.com/TheQMechanic/Tron-Game.git
cd Tron-Game

# Install dependencies
npm install
```

### Running the Web Client
Because the game uses ES modules, serve the project root via any local HTTP server:
```bash
# Using npx serve (or python -m http.server 8000)
npx serve .
```
Open `http://localhost:3000` in your browser.

### Running Desktop Shell (Electron)
```bash
# Launch Electron native desktop window
npm run desktop:dev

# Build standalone Windows executable
npm run desktop:build
```

### Running Test Suites
```bash
# Run domain test suites
npm run test:storage
npm run test:economy
npm run test:armory
npm run test:campaign
```

---

## 🕹️ Controls

| Action | Mouse & Keyboard | Gamepad (Xbox / DualShock) |
| :--- | :--- | :--- |
| **Move** | `W` `A` `S` `D` | Left Thumbstick |
| **Look / Aim** | Mouse Move | Right Thumbstick |
| **Throw Disc** | Left Mouse Button | Right Trigger (`RT`) |
| **Curve Left / Right** | `Q` / `E` (or hold `A` / `D` while throwing) | Left / Right Bumper (`LB` / `RB`) |
| **Parry / Shield** | Right Mouse Button | Left Trigger (`LT`) |
| **Jump** | `Spacebar` | `A` Button / `Cross` |
| **Pause / Menu** | `Esc` / `P` | `Start` / `Options` |

---

## 📜 License

This project uses a **Dual-License** structure:

- **Source Code**: Licensed under the [MIT License](LICENSE). You are free to inspect, modify, learn from, and contribute to the code.
- **Game Assets & Branding**: The *"Arc League"* trademark, logos, 3D character rigs, cosmetic shader parameter sets, procedural audio configurations, and narrative lore ([LORE.md](LORE.md)) are Copyright © 2026 Caleb. All rights reserved.

---

*Compete in the Arcfield. Master the Curve. Become the Apex Athlete.*
