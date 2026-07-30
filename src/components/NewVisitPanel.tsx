import { useEffect, useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createVisit, loadClinicalServices, loadFacilityPhysicians, searchPatients } from '../api/visits';
import { PhysicianScheduleTimeline } from './PhysicianScheduleTimeline';
import { allStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import type { ClinicalServiceOption, PatientOption, PhysicianOption, VisitType } from '../types/visits';
import { Divider } from 'react-native-paper';

interface NewVisitPanelProps {
  token: string;
  facilityId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const VISIT_TYPES: VisitType[] = ['OPD', 'Home'];

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const date = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function formatTimeInput(value: Date) {
  const hour = `${value.getHours()}`.padStart(2, '0');
  const minute = `${value.getMinutes()}`.padStart(2, '0');
  return `${hour}:${minute}`;
}

function combineDateAndTime(dateValue: Date, timeValue: Date) {
  const date = new Date(dateValue);
  date.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
  return date;
}

function displayPersonName(item?: { prefix?: string; firstName?: string; lastName?: string; salutation?: string; suffix?: string }) {
  if (!item) {
    return '-';
  }

  return [item.prefix ?? item.salutation, item.firstName, item.lastName, item.suffix]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function NewVisitPanel({ token, facilityId, onSaved, onCancel }: NewVisitPanelProps) {
  const insets = useSafeAreaInsets();
  const [visitType, setVisitType] = useState<VisitType>('OPD');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [physicians, setPhysicians] = useState<PhysicianOption[]>([]);
  const [services, setServices] = useState<ClinicalServiceOption[]>([]);
  const [selectedPhysicianId, setSelectedPhysicianId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduledFrom, setScheduledFrom] = useState(new Date());
  const [scheduledTo, setScheduledTo] = useState(new Date(Date.now() + 30 * 60 * 1000));
  const [patientNotes, setPatientNotes] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [discountInPercentage, setDiscountInPercentage] = useState('0');
  const [shouldGenerateBill, setShouldGenerateBill] = useState(false);
  const [onwardTravelTimeInMins, setOnwardTravelTimeInMins] = useState('0');
  const [returnTravelTimeInMins, setReturnTravelTimeInMins] = useState('0');
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'date' | 'from' | 'to' | null>(null);

  const selectedService = useMemo(
    () => services.find((item) => item.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const selectedPhysician = useMemo(
    () => physicians.find((item) => item.id === selectedPhysicianId) ?? null,
    [physicians, selectedPhysicianId],
  );

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoadingFormData(true);
      setErrorMessage(null);

      try {
        const [physicianList, serviceList] = await Promise.all([
          loadFacilityPhysicians(token, facilityId),
          loadClinicalServices(token, facilityId, visitType),
        ]);

        if (cancelled) {
          return;
        }

        setPhysicians(physicianList);
        setServices(serviceList);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load visit form data.');
        }
      } finally {
        if (!cancelled) {
          setLoadingFormData(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [token, facilityId, visitType]);

  useEffect(() => {
    if (!selectedService?.durationInMins) {
      return;
    }

    const nextEnd = new Date(scheduledFrom.getTime() + selectedService.durationInMins * 60 * 1000);
    setScheduledTo(nextEnd);
  }, [selectedServiceId]);

  useEffect(() => {
    if (patientQuery.trim().length < 3) {
      setPatientOptions([]);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      try {
        const results = await searchPatients(token, facilityId, patientQuery.trim());
        if (!cancelled) {
          setPatientOptions(results);
        }
      } catch {
        if (!cancelled) {
          setPatientOptions([]);
        }
      }
    };

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [token, facilityId, patientQuery]);

  const onDateTimeChange = (event: DateTimePickerEvent, value?: Date) => {
    if (event.type === 'dismissed' || !value || !datePickerTarget) {
      setDatePickerTarget(null);
      return;
    }

    if (datePickerTarget === 'date') {
      setSelectedDate(value);
    }

    if (datePickerTarget === 'from') {
      setScheduledFrom(value);
      if (selectedService?.durationInMins) {
        setScheduledTo(new Date(value.getTime() + selectedService.durationInMins * 60 * 1000));
      }
    }

    if (datePickerTarget === 'to') {
      setScheduledTo(value);
    }

    if (Platform.OS === 'android') {
      setDatePickerTarget(null);
    }
  };

  const validate = () => {
    if (!selectedPatient?.id) {
      return 'Please select a patient.';
    }

    if (!selectedServiceId) {
      return 'Please select a primary service.';
    }

    if (!selectedPhysicianId) {
      return 'Please select a physician.';
    }

    const startDateTime = combineDateAndTime(selectedDate, scheduledFrom);
    const endDateTime = combineDateAndTime(selectedDate, scheduledTo);

    if (endDateTime <= startDateTime) {
      return 'End time should be after start time.';
    }

    const parsedAdvance = Number(advanceAmount || 0);
    if (parsedAdvance > 0 && !paymentMode.trim()) {
      return 'Payment mode is required when advance amount is provided.';
    }

    return null;
  };

  const saveVisit = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const startDateTime = combineDateAndTime(selectedDate, scheduledFrom);
      const endDateTime = combineDateAndTime(selectedDate, scheduledTo);
      const parsedAdvance = Number(advanceAmount || 0);
      const parsedDiscount = Number(discountInPercentage || 0);

      await createVisit(token, {
        patientId: selectedPatient?.id ?? '',
        physicianId: selectedPhysicianId,
        scheduledStartDateTime: startDateTime.toISOString(),
        scheduledEndDateTime: endDateTime.toISOString(),
        notes: patientNotes,
        clinicalServiceId: selectedServiceId,
        facilityId,
        visitType,
        onwardTravelTimeInMins: visitType === 'Home' ? Number(onwardTravelTimeInMins || 0) : 0,
        returnTravelTimeInMins: visitType === 'Home' ? Number(returnTravelTimeInMins || 0) : 0,
        referredBy,
        advanceAmount: parsedAdvance > 0 ? parsedAdvance : 0,
        paymentMode: parsedAdvance > 0 ? paymentMode : null,
        shouldGenerateBill,
        discountInPercentage: parsedDiscount,
      });

      onSaved();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create visit.');
    } finally {
      setSaving(false);
    }
  };

  const showDatePicker = datePickerTarget !== null;

  return (
    <View style={allStyles.container}>
      <View style={allStyles.modalContent}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.headerActionRow}>
            <Text style={styles.title}>New Visit</Text>
            {/* <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Close</Text>
            </Pressable> */}
          </View>

          <Text style={styles.subtitle}>Choose visit type and complete scheduling details.</Text>

          <View style={allStyles.typeRow}>
            {VISIT_TYPES.map((type) => {
              const selected = visitType === type;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  style={[allStyles.typeChip, selected ? allStyles.typeChipActive : null]}
                  onPress={() => setVisitType(type)}
                >
                  <Text style={[allStyles.typeChipText, selected ? allStyles.typeChipTextActive : null]}>{type}</Text>
                </Pressable>
              );
            })}
          </View>

          {errorMessage ? <Text style={allStyles.errorText}>{errorMessage}</Text> : null}

          {loadingFormData ? (
            <View style={allStyles.loadingRow}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={allStyles.loadingText}>Loading form options...</Text>
            </View>
          ) : null}
          <Text style={allStyles.label}>Search Patient</Text>
          <TextInput
            placeholder="Type 3+ characters"
            style={allStyles.input}
            value={patientQuery}
            onChangeText={setPatientQuery}
          />

          {selectedPatient ? (
            <View style={styles.selectedEntityCard}>
              <Text style={styles.selectedEntityTitle}>Selected patient</Text>
              <Text style={styles.selectedEntityText}>{displayPersonName(selectedPatient)}</Text>
            </View>
          ) : null}

          {patientOptions.length > 0 ? (
            <ScrollView
              style={styles.optionsScrollArea}
              contentContainerStyle={styles.optionsWrap}
              nestedScrollEnabled
              showsVerticalScrollIndicator={patientOptions.length > 3}
            >
              {patientOptions.map((patient) => (
                <Pressable key={patient.id} onPress={() => setSelectedPatient(patient)} style={styles.optionCard}>
                  <Text style={styles.optionTitle}>{displayPersonName(patient)}</Text>
                  <Text style={styles.optionMeta}>
                    {(patient.mrn || '-') + ' | ' + (patient.mobileNo || '-')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <Text style={allStyles.label}>Primary Service</Text>
          <ScrollView
            style={styles.optionsScrollArea}
            contentContainerStyle={styles.optionsWrap}
            nestedScrollEnabled
            showsVerticalScrollIndicator={services.length > 3}
          >
            {services.map((service) => {
              const selected = selectedServiceId === service.id;
              return (
                <Pressable
                  key={service.id}
                  style={[styles.optionCard, selected ? styles.optionCardActive : null]}
                  onPress={() => setSelectedServiceId(service.id)}
                >
                  <Text style={styles.optionTitle}>{service.name || '-'}</Text>
                  <Text style={styles.optionMeta}>Fees Rs. {service.fees ?? 0} | {service.durationInMins ?? 0} mins</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={allStyles.label}>Physician</Text>
          <ScrollView
            style={styles.optionsScrollArea}
            contentContainerStyle={styles.optionsWrap}
            nestedScrollEnabled
            showsVerticalScrollIndicator={physicians.length > 3}
          >
            {physicians.map((physician) => {
              const selected = selectedPhysicianId === physician.id;
              return (
                <Pressable
                  key={physician.id}
                  style={[styles.optionCard, selected ? styles.optionCardActive : null]}
                  onPress={() => setSelectedPhysicianId(physician.id)}
                >
                  <Text style={styles.optionTitle}>{displayPersonName(physician)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {visitType === 'Home' ? (
            <>
              <Text style={allStyles.label}>Travel Time (Onward, mins)</Text>
              <TextInput
                style={allStyles.input}
                value={onwardTravelTimeInMins}
                keyboardType="numeric"
                onChangeText={setOnwardTravelTimeInMins}
              />
              <Text style={allStyles.label}>Travel Time (Return, mins)</Text>
              <TextInput
                style={allStyles.input}
                value={returnTravelTimeInMins}
                keyboardType="numeric"
                onChangeText={setReturnTravelTimeInMins}
              />
            </>
          ) : null}

          <Text style={allStyles.label}>Visit Date</Text>
          <View style={styles.inlineRow}>
            <Pressable style={[allStyles.datePickerButton, styles.flexOne]} onPress={() => setDatePickerTarget('date')}>
              <Text style={allStyles.datePickerText}>{formatDateInput(selectedDate)}</Text>
              <Feather name="calendar" size={14} color={themeColors.primary} />
            </Pressable>
            {/* <Pressable
              style={styles.calendarAssistButton}
              onPress={() => setIsCalendarOpen(true)}
              disabled={!selectedPhysicianId}
            >
              <Feather name="clock" size={14} color={themeColors.textOnBrand} />
            </Pressable> */}
          </View>

          <Text style={allStyles.label}>Scheduled Time</Text>
          <View style={styles.inlineRow}>
            <Pressable style={[allStyles.datePickerButton, styles.flexOne]} onPress={() => setDatePickerTarget('from')}>
              <Text style={allStyles.datePickerText}>{formatTimeInput(scheduledFrom)}</Text>
              <Feather name="clock" size={14} color={themeColors.primary} />
            </Pressable>
            <Pressable style={[allStyles.datePickerButton, styles.flexOne]} onPress={() => setDatePickerTarget('to')}>
              <Text style={allStyles.datePickerText}>{formatTimeInput(scheduledTo)}</Text>
              <Feather name="clock" size={14} color={themeColors.primary} />
            </Pressable>
          </View>

          <Text style={allStyles.label}>Patient Notes</Text>
          <TextInput
            style={[allStyles.input, allStyles.textArea]}
            multiline
            value={patientNotes}
            onChangeText={setPatientNotes}
            placeholder="Clinical notes for this visit"
          />

          <Text style={allStyles.label}>Referred By</Text>
          <TextInput style={allStyles.input} value={referredBy} onChangeText={setReferredBy} />

          <Text style={allStyles.label}>Advance Amount</Text>
          <TextInput
            style={allStyles.input}
            value={advanceAmount}
            onChangeText={setAdvanceAmount}
            keyboardType="numeric"
            placeholder="0"
          />

          {Number(advanceAmount || 0) > 0 ? (
            <>
              <Text style={allStyles.label}>Payment Mode</Text>
              <TextInput style={allStyles.input} value={paymentMode} onChangeText={setPaymentMode} placeholder="Cash / UPI / Card" />
            </>
          ) : null}

          <Text style={allStyles.label}>Discount (%)</Text>
          <TextInput
            style={allStyles.input}
            value={discountInPercentage}
            onChangeText={setDiscountInPercentage}
            keyboardType="numeric"
            placeholder="0"
          />

          <Pressable style={styles.checkboxRow} onPress={() => setShouldGenerateBill((prev) => !prev)}>
            <View style={[styles.checkbox, shouldGenerateBill ? styles.checkboxActive : null]}>
              {shouldGenerateBill ? <Feather name="check" size={12} color={themeColors.textOnBrand} /> : null}
            </View>
            <Text style={styles.checkboxLabel}>Generate Bill</Text>
          </Pressable>
        </ScrollView>

        <View style={[allStyles.modalFooter, { paddingBottom: Math.max(14, insets.bottom + 14) }]}>
          <Pressable
            accessibilityRole="button"
            style={[allStyles.filterButton, allStyles.modalFooterButton, saving ? styles.disabledButton : null]}
            onPress={() => void saveVisit()}
            disabled={saving}
          >
            <Text style={allStyles.filterButtonText}>{saving ? 'Saving...' : 'Save Visit'}</Text>
          </Pressable>
        </View>
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={datePickerTarget === 'date' ? selectedDate : datePickerTarget === 'from' ? scheduledFrom : scheduledTo}
          mode={datePickerTarget === 'date' ? 'date' : 'time'}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateTimeChange}
        />
      ) : null}

      <PhysicianScheduleTimeline
        visible={isCalendarOpen}
        token={token}
        facilityId={facilityId}
        physicianId={selectedPhysicianId}
        selectedDate={selectedDate}
        serviceId={selectedServiceId || undefined}
        serviceDurationInMins={selectedService?.durationInMins}
        onClose={() => setIsCalendarOpen(false)}
        onSelectSlot={(slot) => {
          const start = new Date(slot.startsAtIsoUtc);
          const end = new Date(slot.endsAtIsoUtc);
          if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            setScheduledFrom(start);
            setScheduledTo(end);
          }
          setIsCalendarOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedEntityCard: {
    borderWidth: 1,
    borderColor: themeColors.successBorder,
    borderRadius: 10,
    backgroundColor: themeColors.successSurface,
    padding: 9,
    marginTop: 8,
  },
  selectedEntityTitle: {
    color: themeColors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  selectedEntityText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  optionsWrap: {
    gap: 6,
    marginTop: 6,
    paddingBottom: 2,
  },
  optionsScrollArea: {
    maxHeight: 198,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    backgroundColor: themeColors.surface,
    padding: 6,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    backgroundColor: themeColors.surface,
    padding: 9,
  },
  optionCardActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.successSurface,
  },
  optionTitle: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  optionMeta: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  flexOne: {
    flex: 1,
  },
  calendarAssistButton: {
    borderRadius: 10,
    backgroundColor: themeColors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarAssistButtonText: {
    color: themeColors.textOnBrand,
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surface,
  },
  checkboxActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  checkboxLabel: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
