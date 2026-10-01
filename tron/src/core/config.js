export const config = {
  ARENA: 46,
  CYAN: 0x4ff2ff,
  ORANGE: 0xff6a10,
  WHITE: 0xffffff,
  PURPLE: 0xb026ff,
  PLAYER_R: 0.9,
  FOE_R: 0.95,
  DISC_R: 0.55,
  CURVE_ACCEL: 38.0,
  CURVE_LAMBDA: 0.45,
  TILE_N: 24,
  TILE_W: (46 * 2) / 24, // (ARENA * 2) / TILE_N
  TILE_WARN_DURATION: 0.75,
  TILE_REGEN_DELAY: 12.0,
  TILE_INTACT: 0,
  TILE_WARNING: 1,
  TILE_FALLEN: 2,
  TILE_REBUILDING: 3,
  appId: typeof __app_id !== 'undefined' ? __app_id : 'tron-disc-arena'
};
