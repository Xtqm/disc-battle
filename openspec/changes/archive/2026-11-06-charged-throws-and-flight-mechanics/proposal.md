# Proposal: Charged Throws, Floor Aim Parity, and Curved Skip Ricochets

## Why

Currently, throwing an Identity Disc suffers from artificial aim constraints and limited tactical depth:
1. Aiming downward at distant floor tiles causes the projectile to glide horizontally across the grid rather than descending to the targeted surface, caused by an over-restrictive pitch clamp (`Math.max(-0.04, ...)`) and continuous upward hover easing that counteracts downward momentum.
2. Floor impacts immediately zero out all lateral curve spin (`k = 0`), preventing players from executing curved skip-shots off arena tiles.
3. Throws are binary single-tap actions at fixed speed and fixed damage, lacking risk/reward nuance or a counter against defensive blocking/shielding.

Upgrading disc combat with charged throws, true downward floor aim, and curved floor skip retention provides high-skill tactical depth, breaks defensive stalemates, and establishes a foundation for an expanding arsenal.

## What Changes

- **Charged Disc Throws**: Players can hold the throw input (Mouse Left, Gamepad Trigger, or Touch) to charge a throw up to 1.0 second.
  - Launch velocity scales continuously from 38 m/s up to 55 m/s.
  - Base damage scales proportionally with velocity (from 55 HP up to 95 HP before ricochet and rear-strike multipliers).
  - Gyroscopic rigidity decreases Magnus lateral curvature proportionally as charge increases, creating a tactical trade-off between wide curving hooks and high-speed linear strikes.
  - Throws charged past threshold (>= 85%) trigger **Guard Crush**, bypassing player blocks and boss shields with stagger feedback.
  - Diegetic HUD crosshair charging arc indicator with distinct audio/haptic cues.
- **Curved Floor Ricochet Retention**:
  - Identity discs impacting the floor preserve 65% of their lateral curve spin (`k = k * 0.65`) rather than wiping to zero, maintaining rotational direction and enabling curved skip-bank trajectories off the floor.
  - Upward bounce pop clears the floor plane while retaining curve momentum for follow-up flight.
- **Downward Floor Aim & Flight Parity**:
  - Remove the artificial $-0.04$ ($ -2.3^\circ$) launch pitch clamp for intentional floor targeting beyond player clearance distance ($> 2.5\text{m}$).
  - Decouple hover buoyancy during active downward ballistic flight so discs track accurately toward aimed floor targets without synthetic horizontal gliding.
  - Align `simulatePath` and `updateTrajectory` with identical floor aiming and skip-curve physics.

## Capabilities

### Modified Capabilities
- `disc-combat`: Update flight trajectory, floor aim raycasting, floor ricochet curve retention, and add charged throw dynamics and shield penetration requirements.

## Impact

- `src/entities/Player.js`: Implement throw charging input cycle, charge state tracking, HUD telemetry, and remove the $-0.04$ floor pitch clamp.
- `src/entities/Disc.js`: Support charged launch velocity, proportional damage scaling, gyroscopic curve dampening, guard break checks, and 65% floor curve spin retention.
- `src/physics/trajectory.js`: Mirror charge speed scaling, gyroscopic curve dampening, downward floor raycasting, and floor curve retention in trajectory preview.
- `src/ui/hud.js`: Render circular charge arc meter around the crosshair and display Guard Crush alerts.
- `src/audio/sfx.js` & `src/input/gamepad.js`: Add charge windup SFX, release blast SFX, guard crush impact, and rumble triggers.
- `src/network/sync.js`: Add `charge` scalar to networked `DISC_THROW` packets across WebRTC DataChannels.
