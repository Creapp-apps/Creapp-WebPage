import React, { useEffect, useState } from 'react';
import './portal.css';

const MESSAGES = [
  'Preparando tu campaña…',
  'Encendiendo las luces…',
  'Trayendo las piezas…',
  'Puliendo los últimos detalles…',
  'Ya casi…',
];

/**
 * Loader del portal en la estética de la campaña (navy + acento madera), con
 * mensajes rotando. Se usa en TODAS las capas de carga (Suspense del chunk,
 * guard de auth y carga de datos) para que no haya salto visual con el shell
 * negro/violeta de CreAPP.
 */
export const PortalLoader: React.FC = () => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 950);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="portal">
      <div className="ploader">
        <div className="pspin" aria-hidden="true" />
        <div className="peyebrow">Tu agencia te presenta</div>
        <div className="pmsg" key={i}>{MESSAGES[i]}</div>
      </div>
    </div>
  );
};

export default PortalLoader;
