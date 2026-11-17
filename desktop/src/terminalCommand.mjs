// Arma el string que se manda a la terminal visible para instalar una dependencia:
// explica qué se instala, deja el comando ESCRITO (echo) y luego lo corre.
// Puro: sin APIs de Node. NOTA: preflight.js lleva una copia idéntica (file:// + CSP
// impiden importar módulos); esta es la fuente de verdad testeada.
const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

export function buildInstallTerminalCommand(label, command) {
  const cmd = String(command == null ? '' : command).replace(/[\r\n]+/g, ' ').trim();
  const lbl = String(label == null ? '' : label).replace(/[\r\n]+/g, ' ').trim();
  const intro = `CreAPP va a instalar: ${lbl}. Si algo falla, el error se ve acá abajo.`;
  return `echo ${shq(intro)} && echo ${shq('> ' + cmd)} && ${cmd}`;
}
