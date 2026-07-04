export interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  checkInLocationName?: string | null;
  checkOutLocationName?: string | null;
}

export interface AttendanceEntry {
  id: string;
  userId: string;
  userName: string;
  attendanceDate: string;
  checkInTime: string;
  checkOutTime: string | null;
  checkInAllowedLocationId: string | null;
  checkInAllowedLocationName: string | null;
  checkOutAllowedLocationId: string | null;
  checkOutAllowedLocationName: string | null;
  checkInLocationName?: string | null;
  checkOutLocationName?: string | null;
  checkInLatitude: number;
  checkInLongitude: number;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  companyId: string;
  createdOn: string;
  createdByUserId: string;
  lastModifiedOn: string;
  lastModifiedByUserId: string;
  timeZone: string;
}

export interface AttendanceCoordinates {
  latitude: number;
  longitude: number;
}

export interface MyAttendanceFilter {
  month: number;
  year: number;
}

export interface AttendanceAllowedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}
