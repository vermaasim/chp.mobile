import type { AttendanceAllowedLocation, GeoPoint } from '../types/attendance';

export interface AppMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface AppMapProps {
  region: AppMapRegion;
  allowedLocations: AttendanceAllowedLocation[];
  userLocation: GeoPoint | null;
  radiusMeters: number;
  onRegionChangeComplete: (region: AppMapRegion) => void;
}

export interface AppMapHandle {
  animateToRegion: (region: AppMapRegion, duration?: number) => void;
}
