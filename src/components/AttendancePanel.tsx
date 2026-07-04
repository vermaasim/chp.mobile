import { useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  checkInAttendance,
  checkOutAttendance,
  loadAllowedAttendanceLocations,
  loadMyAttendance,
} from '../api/attendance';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppMap } from './AppMap';
import { MonthYearDropdown, type MonthYearOption } from './MonthYearDropdown';
import type { AppMapHandle } from './AppMap.types';
import type {
  AttendanceAllowedLocation,
  AttendanceEntry,
  AttendanceRecord,
  GeoPoint,
} from '../types/attendance';
import { findNearestAllowedLocation } from '../utils/geofence';
import { themeColors } from '../theme/colors';

const ATTENDANCE_RADIUS_METERS = 100;
const LOCATION_REFRESH_INTERVAL_MS = 30000;

type AttendanceRow = AttendanceRecord & {
  rowKey: string;
};

type SnackbarVariant = 'success' | 'error';

function formatDate(value: Date) {
  return value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value: Date) {
  return value.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDateTime(value: Date, timeZone?: string | null) {
  const targetTimeZone = timeZone?.trim() || 'Asia/Kolkata';

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: targetTimeZone,
    }).format(value);
}

function formatDuration(start: Date, end: Date) {
  const diffMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(diffMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (diffMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatMonthYearLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

function buildMonthYearOptions(): MonthYearOption[] {
  const startYear = 2026;
  const startMonth = 6;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const options: MonthYearOption[] = [];

  let year = startYear;
  let month = startMonth;

  while (year < currentYear || (year === currentYear && month <= currentMonth)) {
    options.push({
      key: `${year}-${month.toString().padStart(2, '0')}`,
      label: formatMonthYearLabel(month, year),
      month,
      year,
    });

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return options;
}

function mapEntryToRecord(entry: AttendanceEntry): AttendanceRow {
  const checkInDate = new Date(`${entry.checkInTime}Z`);
  const checkOutDate = entry.checkOutTime ? new Date(`${entry.checkOutTime}Z`) : null;

  return {
    rowKey: entry.id,
    date: formatDate(checkInDate),
    checkIn: formatDateTime(checkInDate, entry.timeZone),
    checkOut: checkOutDate ? formatDateTime(checkOutDate, entry.timeZone) : '',
    duration: checkOutDate ? formatDuration(checkInDate, checkOutDate) : '',
    checkInLocationName: entry.checkInLocationName ?? entry.checkInAllowedLocationName,
    checkOutLocationName: entry.checkOutLocationName ?? entry.checkOutAllowedLocationName,
  };
}

function extractApiMessage(responseData: unknown): string | null {
  if (typeof responseData === 'string') {
    return responseData;
  }

  if (!responseData || typeof responseData !== 'object') {
    return null;
  }

  if ('message' in responseData && typeof responseData.message === 'string') {
    return responseData.message;
  }

  if ('title' in responseData && typeof responseData.title === 'string') {
    return responseData.title;
  }

  if ('errors' in responseData && responseData.errors && typeof responseData.errors === 'object') {
    const firstError = Object.values(responseData.errors)[0];

    if (Array.isArray(firstError) && typeof firstError[0] === 'string') {
      return firstError[0];
    }

    if (typeof firstError === 'string') {
      return firstError;
    }
  }

  return null;
}

function toUserFriendlyError(error: unknown, fallbackMessage: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    const apiMessage = extractApiMessage(error.response.data);
    if (apiMessage) {
      return apiMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function AttendancePanel() {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [activeCheckIn, setActiveCheckIn] = useState<Date | null>(null);
  const [allowedLocations, setAllowedLocations] = useState<AttendanceAllowedLocation[]>([]);
  const [isLoadingAllowedLocations, setIsLoadingAllowedLocations] = useState(false);
  const [isLoadingAttendanceList, setIsLoadingAttendanceList] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [locationDialog, setLocationDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    variant: SnackbarVariant;
  }>({
    visible: false,
    message: '',
    variant: 'success',
  });
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monthYearOptions = buildMonthYearOptions();
  const [selectedMonthYearKey, setSelectedMonthYearKey] = useState(
    monthYearOptions[monthYearOptions.length - 1]?.key ?? '2026-01',
  );
  const fallbackPoint = allowedLocations[0] ?? null;
  const selectedMonthYear = useMemo(
    () =>
      monthYearOptions.find((option) => option.key === selectedMonthYearKey) ??
      monthYearOptions[monthYearOptions.length - 1] ??
      null,
    [monthYearOptions, selectedMonthYearKey],
  );

  const nearestAllowedLocation = useMemo(
    () => findNearestAllowedLocation(userLocation, allowedLocations),
    [userLocation, allowedLocations],
  );

  const isWithinAttendanceRange =
    nearestAllowedLocation !== null && nearestAllowedLocation.distanceMeters < ATTENDANCE_RADIUS_METERS;

  const canTakeAttendanceAction = Boolean(hasLocationPermission) && isWithinAttendanceRange;

  const canCheckIn = activeCheckIn === null && canTakeAttendanceAction;
  const canCheckOut = activeCheckIn !== null && canTakeAttendanceAction;

  const locationStatusMessage = useMemo(() => {
    if (isLoadingAllowedLocations) {
      return 'Loading allowed attendance locations...';
    }

    if (allowedLocations.length === 0) {
      return 'No allowed locations are configured for attendance.';
    }

    if (isLocationLoading) {
      return 'Checking your current location...';
    }

    if (hasLocationPermission === false) {
      return 'Location permission is denied. Attendance actions are disabled.';
    }

    if (!userLocation) {
      return 'Current location is not available. Attendance actions are disabled.';
    }

    if (isWithinAttendanceRange) {
      return 'You are inside an allowed attendance zone.';
    }

    return 'You are outside the 100m attendance range. Move closer to an allowed location.';
  }, [
    isLoadingAllowedLocations,
    allowedLocations.length,
    isLocationLoading,
    hasLocationPermission,
    userLocation,
    isWithinAttendanceRange,
  ]);

  const mapCenter = userLocation ??
    (fallbackPoint
      ? {
          latitude: fallbackPoint.latitude,
          longitude: fallbackPoint.longitude,
        }
      : null);
  const mapRef = useRef<AppMapHandle | null>(null);

  const fetchAttendanceList = async (force = false) => {
    if (!selectedMonthYear) {
      return;
    }

    if (isLoadingAttendanceList && !force) {
      return;
    }

    setIsLoadingAttendanceList(true);
    try {
      const entries = await loadMyAttendance({
        month: selectedMonthYear.month,
        year: selectedMonthYear.year,
      });

      setRecords(entries.map(mapEntryToRecord));

      const openEntry = entries.find((entry) => !entry.checkOutTime);
      setActiveCheckIn(openEntry ? new Date(openEntry.checkInTime) : null);
    } finally {
      setIsLoadingAttendanceList(false);
    }
  };

  const refreshAllowedLocations = () => {
    void (async () => {
      setIsLoadingAllowedLocations(true);
      try {
        const locations = await loadAllowedAttendanceLocations();
        setAllowedLocations(locations);
      } finally {
        setIsLoadingAllowedLocations(false);
      }
    })();
  };

  const refreshUserLocation = () => {
    void (async () => {
      setIsLocationLoading(true);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          setHasLocationPermission(false);
          setUserLocation(null);
          return;
        }

        setHasLocationPermission(true);
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

        setUserLocation({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      } catch {
        setUserLocation(null);
      } finally {
        setIsLocationLoading(false);
      }
    })();
  };

  useEffect(() => {
    refreshAllowedLocations();
  }, []);

  useEffect(() => {
    if (!selectedMonthYear) {
      return;
    }

    let isMounted = true;

    const refreshAttendance = async () => {
      if (!isMounted) {
        return;
      }

      await fetchAttendanceList(true);
    };

    void refreshAttendance();

    return () => {
      isMounted = false;
    };
  }, [selectedMonthYearKey]);

  const refreshAttendanceList = () => {
    void fetchAttendanceList();
  };

  useEffect(() => {
    refreshUserLocation();

    // const timer = setInterval(() => {
    //   refreshUserLocation();
    // }, LOCATION_REFRESH_INTERVAL_MS);

    // return () => {
    //   clearInterval(timer);
    // };
  }, []);

  const handleRefreshLocationData = () => {
    refreshUserLocation();
    refreshAllowedLocations();
  };

  const handleCheckIn = () => {
    if (!userLocation || isCheckingIn) {
      return;
    }

    void (async () => {
      setIsCheckingIn(true);
      try {
        const entry = await checkInAttendance(userLocation);
        const checkInTime = new Date(entry.checkInTime);

        setActiveCheckIn(checkInTime);
        await fetchAttendanceList(true);
        showSnackbar(
          entry.checkInLocationName ??
            entry.checkInAllowedLocationName ??
            'Your attendance has been recorded successfully.',
          'success',
        );
        // setRecords((prev) => [
        //   {
        //     date: formatDate(checkInTime),
        //     checkIn: formatTime(checkInTime),
        //     checkOut: '',
        //     duration: '',
        //     checkInLocationName: entry.checkInLocationName ?? entry.checkInAllowedLocationName,
        //     checkOutLocationName: null,
        //   },
        //   ...prev,
        // ]);
      } catch (error) {
        showSnackbar(
          toUserFriendlyError(error, 'Unable to check in right now. Please try again.'),
          'error',
        );
      } finally {
        setIsCheckingIn(false);
      }
    })();
  };

  const handleCheckOut = () => {
    if (!activeCheckIn || !userLocation || isCheckingOut) {
      return;
    }

    void (async () => {
      setIsCheckingOut(true);
      try {
        const entry = await checkOutAttendance(userLocation);
        const checkOutTime = new Date(entry.checkOutTime ?? new Date().toISOString());
        await fetchAttendanceList(true);

        // setRecords((prev) => {
        //   if (prev.length === 0) {
        //     return prev;
        //   }

        //   const [latest, ...rest] = prev;
        //   return [
        //     {
        //       ...latest,
        //       checkOut: formatTime(checkOutTime),
        //       duration: formatDuration(activeCheckIn, checkOutTime),
        //       checkOutLocationName: entry.checkOutLocationName ?? entry.checkOutAllowedLocationName,
        //     },
        //     ...rest,
        //   ];
        // });
        setActiveCheckIn(null);
        showSnackbar(
          entry.checkOutLocationName ??
            entry.checkOutAllowedLocationName ??
            'Your attendance has been updated successfully.',
          'success',
        );
      } catch (error) {
        showSnackbar(
          toUserFriendlyError(error, 'Unable to check out right now. Please try again.'),
          'error',
        );
      } finally {
        setIsCheckingOut(false);
      }
    })();
  };

  const [region, setRegion] = useState(() =>
    mapCenter
      ? {
          latitude: mapCenter.latitude,
          longitude: mapCenter.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }
      : null,
  );

  useEffect(() => {
    if (!mapCenter) {
      setRegion(null);
      return;
    }

    setRegion({
      latitude: mapCenter.latitude,
      longitude: mapCenter.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    });
  }, [mapCenter?.latitude, mapCenter?.longitude]);

  const handleResetMap = () => {
    if (!mapCenter) {
      return;
    }

    const nextRegion = {
      latitude: mapCenter.latitude,
      longitude: mapCenter.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };

    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 250);
  };

  const openLocationDialog = (title: string, message: string) => {
    setLocationDialog({
      visible: true,
      title,
      message,
    });
  };

  const closeLocationDialog = () => {
    setLocationDialog((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  const showSnackbar = (message: string, variant: SnackbarVariant) => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }

    setSnackbar({
      visible: true,
      message,
      variant,
    });

    snackbarTimerRef.current = setTimeout(() => {
      setSnackbar((prev) => ({
        ...prev,
        visible: false,
      }));
      snackbarTimerRef.current = null;
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.mapHeader}>
        <View style={styles.mapActions}>
          <Pressable
            accessibilityRole="button"
            onPress={handleResetMap}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshButtonText}>Reset Map</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleRefreshLocationData}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshButtonText}>Refresh Location</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.mapCard}>
        {mapCenter ? (
          <AppMap
            ref={mapRef}
            region={region ?? {
              latitude: mapCenter.latitude,
              longitude: mapCenter.longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
            allowedLocations={allowedLocations}
            userLocation={userLocation}
            radiusMeters={ATTENDANCE_RADIUS_METERS}
            onRegionChangeComplete={(nextRegion) => setRegion(nextRegion)}
          />
        ) : (
          <View style={styles.mapFallback}>
            <Text style={styles.mapFallbackText}>Map will appear once an allowed location is loaded.</Text>
          </View>
        )}
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Status</Text>
        <Text style={styles.statusValue}>{locationStatusMessage}</Text>
        {nearestAllowedLocation ? (
          <Text style={styles.metaText}>
            Nearest location: {nearestAllowedLocation.location.name} ({Math.round(nearestAllowedLocation.distanceMeters)}m)
          </Text>
        ) : null}
        {isLocationLoading || isLoadingAllowedLocations ? (
          <Text style={styles.metaText}>Updating location checks...</Text>
        ) : null}
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          disabled={!canCheckIn || isCheckingIn}
          onPress={handleCheckIn}
          style={[styles.actionButton, !canCheckIn || isCheckingIn ? styles.buttonDisabled : null]}
        >
          {isCheckingIn ? (
            <ActivityIndicator size="small" color={themeColors.textOnBrand} />
          ) : (
            <Text style={styles.actionButtonText}>Check in</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!canCheckOut || isCheckingOut}
          onPress={handleCheckOut}
          style={[styles.actionButton, !canCheckOut || isCheckingOut ? styles.buttonDisabled : null]}
        >
          {isCheckingOut ? (
            <ActivityIndicator size="small" color={themeColors.textOnBrand} />
          ) : (
            <Text style={styles.actionButtonText}>Check out</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.tableContainer}>
        <View style={styles.filterWrap}>
          <View style={styles.filterHeaderRow}>
            <Text style={styles.filterLabel}>Attendance Period</Text>
            <Pressable
              accessibilityRole="button"
              onPress={refreshAttendanceList}
              disabled={isLoadingAttendanceList}
              style={[styles.listRefreshButton, isLoadingAttendanceList ? styles.listRefreshButtonDisabled : null]}
            >
              {isLoadingAttendanceList ? (
                <ActivityIndicator size="small" color={themeColors.textPrimary} />
              ) : (
                <Feather name="refresh-cw" size={14} color={themeColors.textPrimary} />
              )}
            </Pressable>
          </View>
          <MonthYearDropdown
            options={monthYearOptions}
            selectedKey={selectedMonthYearKey}
            onSelect={(option) => {
              setSelectedMonthYearKey(option.key);
            }}
          />
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.headerCell}>Check In</Text>
          <Text style={styles.headerCell}>Check out</Text>
          <Text style={styles.headerCell}>Duration (Hrs)</Text>
        </View>

        <ScrollView style={styles.rowsWrapper}>
          {records.map((record) => (
            <View key={record.rowKey} style={styles.dataRow}>
              <View style={styles.dataCellWrap}>
                <Text style={styles.dataCell}>{record.checkIn || '-'}</Text>
                {record.checkIn ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      openLocationDialog(
                        'Check In Location',
                        record.checkInLocationName ?? 'Location not available',
                      );
                    }}
                    style={styles.mapIconButton}
                  >
                    <Feather name="map-pin" size={12} color={themeColors.textPrimary} />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.dataCellWrap}>
                <Text style={styles.dataCell}>{record.checkOut || '-'}</Text>
                {record.checkOut ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      openLocationDialog(
                        'Check Out Location',
                        record.checkOutLocationName ?? 'Location not available',
                      );
                    }}
                    style={styles.mapIconButton}
                  >
                    <Feather name="map-pin" size={12} color={themeColors.textPrimary} />
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.dataCell}>{record.duration || '-'}</Text>
            </View>
          ))}

          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No attendance entries yet.</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={locationDialog.visible}
        onRequestClose={closeLocationDialog}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>{locationDialog.title}</Text>
            <Text style={styles.dialogMessage}>{locationDialog.message}</Text>

            <Pressable
              accessibilityRole="button"
              onPress={closeLocationDialog}
              style={styles.dialogButton}
            >
              <Text style={styles.dialogButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {snackbar.visible ? (
        <View
          style={[
            styles.snackbar,
            snackbar.variant === 'success' ? styles.snackbarSuccess : styles.snackbarError,
          ]}
        >
          <Text style={styles.snackbarText}>{snackbar.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 14,
    minHeight: 320,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  mapActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  mapTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  refreshButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: themeColors.surfaceMuted,
  },
  refreshButtonText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  mapCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: 12,
  },
  mapFallback: {
    height: 200,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surfaceMuted,
    paddingHorizontal: 12,
  },
  mapFallbackText: {
    color: themeColors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  statusLabel: {
    color: themeColors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  statusValue: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaText: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: themeColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  buttonDisabled: {
    backgroundColor: '#D8E5E5',
  },
  actionButtonText: {
    color: themeColors.textOnBrand,
    fontSize: 14,
    fontWeight: '800',
  },
  tableContainer: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColors.border,
    overflow: 'hidden',
    flex: 1,
  },
  filterWrap: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: themeColors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    gap: 6,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    color: themeColors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  listRefreshButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  listRefreshButtonDisabled: {
    opacity: 0.8,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: themeColors.surface,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerCell: {
    flex: 1,
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  rowsWrapper: {
    maxHeight: 300,
    backgroundColor: '#FAFDFD',
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8F0F0',
    alignItems: 'center',
  },
  dataCellWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dataCell: {
    flex: 1,
    color: themeColors.textPrimary,
    fontSize: 12,
    textAlign: 'center',
  },
  mapIconButton: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateColumn: {
    flex: 1.4,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: themeColors.textSecondary,
    fontSize: 13,
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialogCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dialogTitle: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  dialogMessage: {
    color: themeColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  dialogButton: {
    alignSelf: 'flex-end',
    borderRadius: 10,
    backgroundColor: themeColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dialogButtonText: {
    color: themeColors.textOnBrand,
    fontSize: 13,
    fontWeight: '800',
  },
  snackbar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  snackbarSuccess: {
    backgroundColor: themeColors.successSurface,
    borderColor: themeColors.successBorder,
  },
  snackbarError: {
    backgroundColor: themeColors.errorSurface,
    borderColor: themeColors.errorBorder,
  },
  snackbarText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
});
