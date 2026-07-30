import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { loadPhysicianAvailableSlots, loadPhysicianScheduleForDate } from '../api/visits';
import { themeColors } from '../theme/colors';
import type { AvailableSlot, PhysicianScheduleItem } from '../types/visits';

interface PhysicianScheduleTimelineProps {
  visible: boolean;
  token: string;
  facilityId: string;
  physicianId: string;
  selectedDate: Date;
  serviceId?: string;
  serviceDurationInMins?: number;
  onClose: () => void;
  onSelectSlot: (slot: AvailableSlot) => void;
}

function toDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toIsoStartOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function toIsoEndOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function slotIntersects(time: Date, scheduleItem: PhysicianScheduleItem) {
  const start = new Date(scheduleItem.startsAtIsoUtc);
  const end = new Date(scheduleItem.endsAtIsoUtc);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  const rowEnd = new Date(time.getTime() + 30 * 60 * 1000);
  return start < rowEnd && end > time;
}

function matchAvailableSlot(time: Date, slots: AvailableSlot[]) {
  return slots.find((slot) => {
    const slotStart = new Date(slot.startsAtIsoUtc);
    return slotStart.getHours() === time.getHours() && slotStart.getMinutes() === time.getMinutes();
  });
}

export function PhysicianScheduleTimeline({
  visible,
  token,
  facilityId,
  physicianId,
  selectedDate,
  serviceId,
  serviceDurationInMins,
  onClose,
  onSelectSlot,
}: PhysicianScheduleTimelineProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [scheduleItems, setScheduleItems] = useState<PhysicianScheduleItem[]>([]);

  const timelineSlots = useMemo(() => {
    const slots: Date[] = [];
    const base = new Date(selectedDate);
    base.setHours(0, 0, 0, 0);

    for (let i = 0; i < 48; i += 1) {
      slots.push(new Date(base.getTime() + i * 30 * 60 * 1000));
    }

    return slots;
  }, [selectedDate]);

  useEffect(() => {
    if (!visible || !physicianId) {
      return;
    }

    let cancelled = false;

    const loadCalendarData = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const dayStartIso = toIsoStartOfDay(selectedDate);
        const dayEndIso = toIsoEndOfDay(selectedDate);

        const [slots, schedule] = await Promise.all([
          loadPhysicianAvailableSlots(token, physicianId, [dayStartIso], serviceId, serviceDurationInMins),
          loadPhysicianScheduleForDate(token, facilityId, physicianId, dayStartIso, dayEndIso),
        ]);

        if (cancelled) {
          return;
        }

        setAvailableSlots(slots);
        setScheduleItems(schedule);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load physician calendar.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCalendarData();

    return () => {
      cancelled = true;
    };
  }, [visible, token, facilityId, physicianId, selectedDate, serviceId, serviceDurationInMins]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Physician Calendar</Text>
            <Text style={styles.subtitle}>{toDateLabel(selectedDate)}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={16} color={themeColors.textPrimary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={themeColors.primary} />
              <Text style={styles.loadingText}>Loading schedule...</Text>
            </View>
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <ScrollView style={styles.timeline} contentContainerStyle={styles.timelineContent}>
            {timelineSlots.map((slotTime) => {
              const bookedItem = scheduleItems.find((item) => slotIntersects(slotTime, item));
              const available = matchAvailableSlot(slotTime, availableSlots);

              return (
                <Pressable
                  key={slotTime.toISOString()}
                  accessibilityRole="button"
                  onPress={() => {
                    if (available) {
                      onSelectSlot(available);
                    }
                  }}
                  style={[
                    styles.row,
                    bookedItem ? styles.rowBooked : null,
                    available ? styles.rowAvailable : null,
                  ]}
                >
                  <Text style={styles.rowTime}>{formatTimeLabel(slotTime)}</Text>
                  <View style={styles.rowBody}>
                    {bookedItem ? <Text style={styles.bookedText}>{bookedItem.title || 'Booked'}</Text> : null}
                    {!bookedItem && available ? <Text style={styles.availableText}>Available slot</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.helperText}>Tap an available row to apply that start time to the visit form.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: themeColors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    maxHeight: '86%',
    minHeight: '66%',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 999,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: {
    marginTop: 6,
  },
  timelineContent: {
    gap: 4,
    paddingBottom: 10,
  },
  row: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowAvailable: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.successSurface,
  },
  rowBooked: {
    backgroundColor: themeColors.warningSurface,
    borderColor: themeColors.warningBorder,
  },
  rowTime: {
    width: 68,
    color: themeColors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  rowBody: {
    flex: 1,
  },
  bookedText: {
    color: themeColors.warningText,
    fontSize: 12,
    fontWeight: '600',
  },
  availableText: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: '#B42318',
    fontSize: 12,
    marginBottom: 8,
  },
  helperText: {
    color: themeColors.textSecondary,
    fontSize: 11,
    marginTop: 8,
  },
});
