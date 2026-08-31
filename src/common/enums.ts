export enum UserRole {
  ADMIN = 'admin',
  VOLUNTEER = 'volunteer',
  RECEPTION = 'reception',
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
