import * as React from "react";

/**
 * En-tête du volet — logo officiel LumenJuris (cercle + nom de la marque),
 * repris de front/src/components/common/LumenJurisLogo.tsx.
 */
const Header: React.FC = () => (
  <header className="lj-header">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="22 20 200 36"
      width={156}
      height={28}
      aria-label="Lumen Juris"
      role="img"
    >
      <circle cx="34" cy="40" fill="none" r="9" stroke="#0D6EFD" strokeWidth="2" />
      <circle cx="34" cy="40" fill="#0D6EFD" r="4" />
      <text fill="#0A2540" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="700" x="52" y="48">
        Lumen Juris
      </text>
    </svg>
  </header>
);

export default Header;
