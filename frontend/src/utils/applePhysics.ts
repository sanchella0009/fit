/**
 * Apple Fluid Interfaces & Physics Engine
 * Distilled from WWDC 2018 "Designing Fluid Interfaces" & WWDC Design Talks
 */

// 1. Apple Haptics (Taptic Engine emulation via Web Vibration API)
export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export function triggerHaptic(type: HapticType = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return;
  }
  try {
    switch (type) {
      case 'selection':
      case 'light':
        // Crisp 8ms tick for segmented switches and chips
        navigator.vibrate(8);
        break;
      case 'medium':
        // 20ms solid tap for checkboxes, meal selects, buttons
        navigator.vibrate(20);
        break;
      case 'heavy':
        // 35ms authoritative impact for sheet snaps and commitments
        navigator.vibrate(35);
        break;
      case 'success':
        // Dual-tap celebratory pulse: tick - pause - pulse
        navigator.vibrate([12, 45, 18]);
        break;
      case 'warning':
        navigator.vibrate([20, 30, 20]);
        break;
      case 'error':
        navigator.vibrate([40, 60, 40, 60, 40]);
        break;
    }
  } catch (e) {
    // Ignore unsupported browser environments
  }
}

// 2. Apple Rubber-banding Formula (WWDC 2018)
// Soft progressive boundary resistance: the further past the bound, the stiffer it pulls
export function rubberband(overshoot: number, dimension: number, constant: number = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// 3. Apple Momentum Projection Formula
// Projects where a gesture with velocity 'v' (px/s) will naturally decelerate to rest
export function project(initialVelocity: number, decelerationRate: number = 0.998): number {
  return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}

// 4. Closest snap point based on projected resting position
export function findNearestSnapPoint(projectedEndpoint: number, snapPoints: number[]): number {
  if (!snapPoints.length) return projectedEndpoint;
  return snapPoints.reduce((closest, curr) => {
    return Math.abs(curr - projectedEndpoint) < Math.abs(closest - projectedEndpoint) ? curr : closest;
  }, snapPoints[0]);
}

// 5. Apple Optical Tracking helper (negative tracking for large display headers)
export function getAppleTracking(fontSizePx: number): string {
  if (fontSizePx >= 34) return '-0.025em';
  if (fontSizePx >= 28) return '-0.02em';
  if (fontSizePx >= 20) return '-0.015em';
  if (fontSizePx <= 13) return '0.01em';
  return '0em';
}
