import type { AttendanceAllowedLocation, GeoPoint } from '../types/attendance';

const EARTH_RADIUS_METERS = 6371000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceMeters(from: GeoPoint, to: GeoPoint) {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_METERS * arc;
}

export function findNearestAllowedLocation(
  userLocation: GeoPoint | null,
  allowedLocations: AttendanceAllowedLocation[],
) {
  if (!userLocation || allowedLocations.length === 0) {
    return null;
  }

  let nearest: { location: AttendanceAllowedLocation; distanceMeters: number } | null = null;

  for (const location of allowedLocations) {
    const distanceMeters = getDistanceMeters(userLocation, {
      latitude: location.latitude,
      longitude: location.longitude,
    });

    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { location, distanceMeters };
    }
  }

  return nearest;
}
