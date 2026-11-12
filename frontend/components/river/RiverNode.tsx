import type { CSSProperties } from 'react';

/** Marca del recorrido de la rivera. Se ilumina cuando la corriente la alcanza. */
export function RiverNode({ style, className }: { style?: CSSProperties; className?: string }) {
  return <span className={className ? `river-node ${className}` : 'river-node'} data-river-node="" aria-hidden="true" style={style} />;
}
