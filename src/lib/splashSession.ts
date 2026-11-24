// La splash completa (cohete + despegue) corre una vez por sesión del navegador:
// primer ingreso sí, refrescos posteriores no. sessionStorage se limpia al cerrar
// la pestaña, así que una sesión nueva vuelve a verla. Todo en try/catch: en modo
// privado o con storage bloqueado, se comporta como "no vista" sin romper.

const KEY = 'creapp_portal_splash_seen';

export function hasSeenSplash(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markSplashSeen(): void {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* storage no disponible */
  }
}
