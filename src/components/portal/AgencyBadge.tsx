import React from 'react';

export const AgencyBadge: React.FC = () => (
  <div className="agency">
    <img src="/creapp-logo-full.png" alt="CreAPP" />
    <span className="lbl">Hecho por <span className="creapp">CreAPP</span></span>
  </div>
);

export const AgencyFootCredit: React.FC = () => (
  <div className="footcredit">
    <img src="/creapp-logo-full.png" alt="CreAPP" />
    <span>Portal de campaña hecho con <span className="creapp">CreAPP</span> · tu agencia de contenidos</span>
  </div>
);
