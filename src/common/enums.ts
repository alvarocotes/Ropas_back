export enum UserRole {
  ADMIN = 'admin',
  VOLUNTEER = 'volunteer',
  RECEPTION = 'reception',
}

/** Secciones internas que un administrador puede abrir o cerrar por usuario. */
export enum AppModule {
  INVENTORY = 'inventory',
  DONATIONS = 'donations',
  REQUESTS = 'requests',
  NEEDS = 'needs',
  CONTENT = 'content',
  TIME_VOLUNTEERS = 'time_volunteers',
  SHIFT_LOG = 'shift_log',
}

export const ALL_APP_MODULES = Object.values(AppModule);

export function defaultModulesForRole(role: UserRole): AppModule[] {
  if (role === UserRole.ADMIN) {
    return [...ALL_APP_MODULES];
  }
  if (role === UserRole.RECEPTION) {
    return [AppModule.REQUESTS, AppModule.TIME_VOLUNTEERS, AppModule.SHIFT_LOG];
  }
  return [
    AppModule.INVENTORY,
    AppModule.DONATIONS,
    AppModule.REQUESTS,
    AppModule.NEEDS,
    AppModule.SHIFT_LOG,
  ];
}

export function sanitizeModules(raw: unknown): AppModule[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const allowed = new Set<string>(ALL_APP_MODULES);
  return [...new Set(raw.filter((item): item is AppModule => allowed.has(item)))];
}

export function effectiveModules(
  role: UserRole,
  stored: string[] | null | undefined,
): AppModule[] {
  if (role === UserRole.ADMIN) {
    return [...ALL_APP_MODULES];
  }
  const sanitized = sanitizeModules(stored);
  if (sanitized === null) {
    return defaultModulesForRole(role);
  }
  return sanitized;
}

export function userHasModule(
  role: UserRole,
  stored: string[] | null | undefined,
  module: AppModule,
): boolean {
  return effectiveModules(role, stored).includes(module);
}

export enum MovementType {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

export enum RequestStatus {
  RECIBIDO = 'recibido',
  EN_PROCESO = 'en_proceso',
  LISTO = 'listo',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
}

export enum DonationStatus {
  RECIBIDO = 'recibido',
  EN_PROCESO = 'en_proceso',
  INGRESADO = 'ingresado',
  CANCELADO = 'cancelado',
}

/** Cómo se ofrece a ayudar quien se registra en público. */
export enum TimeVolunteerHelpType {
  SEDE = 'sede',
  TRANSPORTE = 'transporte',
}

export enum VehicleKind {
  MOTO = 'moto',
  CARRO = 'carro',
  CAMIONETA = 'camioneta',
  OTRO = 'otro',
}

export enum TimeVolunteerStatus {
  NUEVO = 'nuevo',
  CONTACTADO = 'contactado',
  CONFIRMADO = 'confirmado',
  NO_DISPONIBLE = 'no_disponible',
}
