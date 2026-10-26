import { SetMetadata } from '@nestjs/common';

// Solo permite confirmar/repetir la desactivación. Conserva JWT, identidad
// confirmada y existencia de perfil; no habilita acceso a contenido inactivo.
export const ALLOW_INACTIVE_PROFILE_KEY = 'allowInactiveProfile';
export const AllowInactiveProfile = () => SetMetadata(ALLOW_INACTIVE_PROFILE_KEY, true);
