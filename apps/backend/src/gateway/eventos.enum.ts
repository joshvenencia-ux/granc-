export enum EventosSocket {
    CONECTADO = 'conectado',
    GRANSPIN_TIRADA = 'granspin:tirada',

    // DRONX (Crash)
    DRONX_NUEVA_APUESTA = 'dronx:nueva_apuesta',
    DRONX_INICIAR_RONDA = 'dronx:iniciar_ronda',
    DRONX_FINALIZAR_RONDA = 'dronx:finalizar_ronda',

    // Opcional (si emites avances de X desde el servidor)
    DRONX_X = 'dronx:x',
}
