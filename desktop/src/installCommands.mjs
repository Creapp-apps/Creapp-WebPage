// Mapa de id de check del preflight -> comando crudo de instalación.
// El echo/wrapper lo arma el renderer; acá va solo el comando.
const COMMANDS = {
  python: 'brew install python@3.12',
  ffmpeg: 'brew install ffmpeg',
  ffprobe: 'brew install ffmpeg',
  node: 'brew install node',
  venv: 'python3 -m venv .venv && .venv/bin/pip install -r requirements.txt',
  remotion_modules: 'cd src/remotion && npm install',
};

export function installCommandFor(id) {
  const command = Object.hasOwn(COMMANDS, id) ? COMMANDS[id] : null;
  return { installable: command !== null, command };
}
