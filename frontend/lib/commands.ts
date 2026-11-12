/**
 * Interfaz preparada para órdenes futuras al robot. NO ejecuta nada.
 *
 * El backend expone /api/admin/commands con autenticación Bearer, pero la web
 * no habilita órdenes reales hasta acordar con el equipo de backend el flujo de
 * acceso, auditoría y confirmaciones (ver docs/CONTRATO_API.md, sección 9).
 * Las secuencias de bomba y servos viven en el firmware; la web solo pediría
 * acciones de alto nivel y mostraría su estado.
 */

export type CommandAction = 'irrigate' | 'prime' | 'demo' | 'stop';

export interface CommandRequest {
  action: CommandAction;
  /** 0–2; null para acciones globales. */
  potId: number | null;
  /** 5–80 ml; null para usar la dosis calculada. */
  doseMl: number | null;
}

export type CommandLifecycle = 'pending' | 'accepted' | 'running' | 'completed' | 'failed' | 'cancelled' | 'expired';

export interface CommandReceipt {
  id: string;
  status: CommandLifecycle;
  createdAt: string;
  expiresAt: string;
  message: string | null;
}

/** Interruptor único. Mientras sea false, la interfaz muestra los controles reales deshabilitados. */
export const REAL_COMMANDS_ENABLED = false as const;

export async function sendCommand(_request: CommandRequest): Promise<CommandReceipt> {
  throw new Error('Las órdenes reales están deshabilitadas en esta interfaz.');
}
