// The scene picture and the 3D characters share one coordinate system.
// Pictures are drawn in a 1200 x 1000 box; 1000 units is the picture height.
// World units are metres, as in the character models (y up, ground at 0).

/** World height that fills the picture at zoom 1. */
export const WORLD_H = 3.3
/** Picture units per metre. */
export const U = 1000 / WORLD_H
/** Picture y of the ground line the characters stand on. */
export const GROUND = 850
/** World height at the middle of the picture at zoom 1. */
export const BASE_Y = (GROUND - 500) / U

/** World position to picture units. */
export const px = (x: number): number => 600 + x * U
export const py = (y: number): number => GROUND - y * U

export type Shot = 'solo' | 'duo' | 'face'
