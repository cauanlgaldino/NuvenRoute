import { Route } from '../entities/Route';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parseRouteJson(rawJson: string): Route {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Arquivo inválido. Selecione um JSON válido.');
  }

  if (!isRoute(parsed)) {
    throw new Error('Formato inválido. O JSON não possui os dados esperados da rota.');
  }

  return parsed;
}

export function isRoute(value: unknown): value is Route {
  if (!isRecord(value)) return false;

  const points = value.points;

  return (
    isString(value.routeId) &&
    isString(value.routeName) &&
    isString(value.date) &&
    isString(value.city) &&
    isString(value.state) &&
    isString(value.neighborhood) &&
    isString(value.status) &&
    Array.isArray(points) &&
    points.length > 0 &&
    points.every(isRoutePoint)
  );
}

function isRoutePoint(value: unknown) {
  if (!isRecord(value)) return false;

  return (
    isNumber(value.id) &&
    isNumber(value.order) &&
    isString(value.installationCode) &&
    isString(value.customer) &&
    isString(value.referencePoint) &&
    isString(value.address) &&
    isNumber(value.latitude) &&
    isNumber(value.longitude) &&
    isString(value.meterNumber) &&
    isNumber(value.previousReading) &&
    isString(value.status)
  );
}
