const MOTOR_BASE = 'http://localhost:8000';

/** Link al Estudio del motor para un job. */
export function motorStudio(jobIdMotor: string): string {
  return `${MOTOR_BASE}/static/sig_player.html?job=${encodeURIComponent(jobIdMotor)}`;
}
