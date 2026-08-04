import { useEffect, useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, IconButton } from 'react-native-paper';
import { createVisit, loadClinicalServices, loadFacilityPhysicians, searchPatients } from '../api/visits';
import { themeColors } from '../theme/colors';
import type { ClinicalServiceOption, PatientOption, PhysicianOption, VisitType } from '../types/visits';

interface NewVisitPanelProps {
  token: string;
  facilityId: string;
  facilityName: string;
  displayName: string;
  onMenuPress: () => void;
  onProfilePress: () => void;
  onViewVisits?: () => void;
  onSaved: () => void;
}

const VISIT_TYPES: VisitType[] = ['OPD', 'Home'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Card'] as const;
const STEP_CONFIG = [
  { key: 'visit-patient', title: 'Visit & patient' },
  { key: 'physician', title: 'Physician' },
  { key: 'schedule', title: 'Schedule' },
  { key: 'details-billing', title: 'Details & billing' },
] as const;

type VisitStepKey = (typeof STEP_CONFIG)[number]['key'];

function combineDateAndTime(dateValue: Date, timeValue: Date) {
  const next = new Date(dateValue);
  next.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
  return next;
}

function displayPersonName(item?: { prefix?: string; firstName?: string; lastName?: string; salutation?: string; suffix?: string } | null) {
  if (!item) {
    return '-';
  }

  return [item.prefix ?? item.salutation, item.firstName, item.lastName, item.suffix]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function formatWizardDate(value: Date) {
  const weekday = value.toLocaleDateString(undefined, { weekday: 'short' });
  const month = value.toLocaleDateString(undefined, { month: 'short' });
  return `${weekday}, ${value.getDate()} ${month}\n${value.getFullYear()}`;
}

function formatWizardTime(value: Date) {
  return value.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(' ', '\n');
}

function formatCurrency(value?: number) {
  return `₹${(value ?? 0).toLocaleString('en-IN')}`;
}

function toInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function NewVisitPanel({
  token,
  facilityId,
  facilityName,
  displayName,
  onMenuPress,
  onProfilePress,
  onViewVisits,
  onSaved,
}: NewVisitPanelProps) {
  const insets = useSafeAreaInsets();
  const [visitType, setVisitType] = useState<VisitType>('OPD');
  const [currentStep, setCurrentStep] = useState<VisitStepKey>('visit-patient');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [physicians, setPhysicians] = useState<PhysicianOption[]>([]);
  const [physicianQuery, setPhysicianQuery] = useState('');
  const [services, setServices] = useState<ClinicalServiceOption[]>([]);
  const [selectedPhysicianId, setSelectedPhysicianId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
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
  const [visitCreatedSuccessfully, setVisitCreatedSuccessfully] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<'date' | 'from' | 'to' | null>(null);

  const selectedService = useMemo(
    () => services.find((item) => item.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const selectedPhysician = useMemo(
    () => physicians.find((item) => item.id === selectedPhysicianId) ?? null,
    [physicians, selectedPhysicianId],
  );

  const currentStepIndex = STEP_CONFIG.findIndex((step) => step.key === currentStep);
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex === STEP_CONFIG.length - 1;
  const billingEnabled = shouldGenerateBill;
  const visiblePhysicians = useMemo(() => {
    const query = physicianQuery.trim().toLowerCase();
    if (!query) {
      return physicians;
    }

    return physicians.filter((physician) => displayPersonName(physician).toLowerCase().includes(query));
  }, [physicianQuery, physicians]);

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
        setSelectedPhysicianId((currentValue) => physicianList.some((item) => item.id === currentValue) ? currentValue : '');
        setSelectedServiceId((currentValue) => serviceList.some((item) => item.id === currentValue) ? currentValue : '');
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
  }, [scheduledFrom, selectedService?.durationInMins]);

  useEffect(() => {
    if (patientQuery.trim().length < 3) {
      setPatientOptions([]);
      return;
    }

    if (selectedPatient && patientQuery.trim() === displayPersonName(selectedPatient)) {
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
  }, [facilityId, patientQuery, selectedPatient, token]);

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

  const validateFullForm = () => {
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

    const parsedAdvance = billingEnabled ? Number(advanceAmount || 0) : 0;
    if (parsedAdvance > 0 && !paymentMode.trim()) {
      return 'Payment mode is required when advance amount is provided.';
    }

    return null;
  };

  const validateStep = (step: VisitStepKey) => {
    if (step === 'visit-patient') {
      if (!selectedPatient?.id) {
        return 'Please select a patient.';
      }

      if (!selectedServiceId) {
        return 'Please select a primary service.';
      }

      return null;
    }

    if (step === 'physician') {
      if (!selectedPhysicianId) {
        return 'Please select a physician.';
      }

      return null;
    }

    if (step === 'schedule') {
      const startDateTime = combineDateAndTime(selectedDate, scheduledFrom);
      const endDateTime = combineDateAndTime(selectedDate, scheduledTo);

      if (endDateTime <= startDateTime) {
        return 'End time should be after start time.';
      }

      return null;
    }

    return validateFullForm();
  };

  const saveVisit = async () => {
    const validationMessage = validateFullForm();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const startDateTime = combineDateAndTime(selectedDate, scheduledFrom);
      const endDateTime = combineDateAndTime(selectedDate, scheduledTo);
      const parsedAdvance = billingEnabled ? Number(advanceAmount || 0) : 0;
      const parsedDiscount = billingEnabled ? Number(discountInPercentage || 0) : 0;

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
        shouldGenerateBill: billingEnabled,
        discountInPercentage: parsedDiscount,
      });
      setVisitCreatedSuccessfully(true);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create visit.');
    } finally {
      setSaving(false);
    }
  };

  const goToNextStep = () => {
    const validationMessage = validateStep(currentStep);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    if (isLastStep) {
      void saveVisit();
      return;
    }

    setErrorMessage(null);
    setCurrentStep(STEP_CONFIG[currentStepIndex + 1].key);
  };

  const goToPreviousStep = () => {
    if (isFirstStep) {
      return;
    }

    setErrorMessage(null);
    setCurrentStep(STEP_CONFIG[currentStepIndex - 1].key);
  };

  const renderStepOne = () => (
    <>
      <Text style={styles.sectionLabel}>VISIT TYPE</Text>
      <View style={styles.segmentedControl}>
        {VISIT_TYPES.map((type) => {
          const selected = visitType === type;
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              style={[styles.segmentButton, selected ? styles.segmentButtonActive : null]}
              onPress={() => {
                setVisitType(type);
                setErrorMessage(null);
              }}
            >
              <Text style={[styles.segmentButtonText, selected ? styles.segmentButtonTextActive : null]}>{type === 'Home' ? 'Home visit' : 'OPD'}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>PATIENT</Text>
      <View style={styles.searchInputWrap}>
        <Feather name="search" size={16} color={themeColors.textSecondary} />
        <TextInput
          placeholder="Search by name or phone"
          placeholderTextColor={themeColors.textSecondary}
          style={styles.searchInput}
          value={patientQuery}
          onChangeText={(value) => {
            setPatientQuery(value);
            setErrorMessage(null);
            if (selectedPatient && value.trim() !== displayPersonName(selectedPatient)) {
              setSelectedPatient(null);
            }
          }}
        />
      </View>

      {selectedPatient ? (
        <View style={styles.selectionBanner}>
          <Feather name="check-square" size={16} color={themeColors.primary} />
          <View style={styles.selectionBannerTextWrap}>
            <Text style={styles.selectionBannerTitle}>{displayPersonName(selectedPatient)}</Text>
            <Text style={styles.selectionBannerSubtitle}>{[(selectedPatient.mrn || 'MRN unavailable'), (selectedPatient.mobileNo || 'Phone unavailable')].join(' · ')}</Text>
          </View>
        </View>
      ) : null}

      {patientOptions.length > 0 ? (
        <View style={styles.searchResultsWrap}>
          {patientOptions.map((patient, index) => (
            <Pressable
              key={patient.id}
              onPress={() => {
                setSelectedPatient(patient);
                setPatientQuery(displayPersonName(patient));
                setPatientOptions([]);
                setErrorMessage(null);
              }}
              style={[styles.searchResultRow, index < patientOptions.length - 1 ? styles.rowDivider : null]}
            >
              <Text style={styles.resultPrimaryText}>{displayPersonName(patient)}</Text>
              <Text style={styles.resultSecondaryText}>{[(patient.mobileNo || '-'), (patient.mrn || '-')].join(' · ')}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>PRIMARY SERVICE</Text>
      <View style={styles.listCard}>
        {services.map((service, index) => {
          const selected = selectedServiceId === service.id;
          return (
            <Pressable
              key={service.id}
              style={[styles.selectableRow, selected ? styles.selectableRowActive : null, index < services.length - 1 ? styles.rowDivider : null]}
              onPress={() => {
                setSelectedServiceId(service.id);
                setErrorMessage(null);
              }}
            >
              <View style={[styles.radioOuter, selected ? styles.radioOuterActive : null]}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
              <View style={styles.rowMainTextWrap}>
                <Text style={styles.rowPrimaryText}>{service.name || 'Unnamed service'}</Text>
              </View>
              <Text style={styles.rowMetaText}>{`${formatCurrency(service.fees)} · ${service.durationInMins ?? 0} min`}</Text>
            </Pressable>
          );
        })}

        {services.length === 0 ? (
          <View style={styles.emptyListState}>
            <Text style={styles.emptyListText}>No clinical services are available for this visit type.</Text>
          </View>
        ) : null}
      </View>
    </>
  );

  const renderStepTwo = () => (
    <>
      {selectedService ? (
        <View style={styles.selectionBanner}>
          <Feather name="check-square" size={16} color={themeColors.primary} />
          <View style={styles.selectionBannerTextWrap}>
            <Text style={styles.selectionBannerTitle}>{selectedService.name || 'Selected service'}</Text>
            <Text style={styles.selectionBannerSubtitle}>{`${formatCurrency(selectedService.fees)} · ${selectedService.durationInMins ?? 0} min selected`}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.searchInputWrap}>
        <Feather name="search" size={16} color={themeColors.textSecondary} />
        <TextInput
          placeholder="Search physician or specialty"
          placeholderTextColor={themeColors.textSecondary}
          style={styles.searchInput}
          value={physicianQuery}
          onChangeText={setPhysicianQuery}
        />
      </View>

      <Text style={styles.sectionLabel}>AVAILABLE PHYSICIANS</Text>
      <View style={styles.listCard}>
        {visiblePhysicians.map((physician, index) => {
          const selected = selectedPhysicianId === physician.id;
          const physicianName = displayPersonName(physician);

          return (
            <Pressable
              key={physician.id}
              style={[styles.physicianRow, selected ? styles.selectableRowActive : null, index < visiblePhysicians.length - 1 ? styles.rowDivider : null]}
              onPress={() => {
                setSelectedPhysicianId(physician.id);
                setErrorMessage(null);
              }}
            >
              <View style={[styles.physicianAvatar, selected ? styles.physicianAvatarActive : null]}>
                <Text style={[styles.physicianAvatarText, selected ? styles.physicianAvatarTextActive : null]}>{toInitials(physicianName)}</Text>
              </View>
              <View style={styles.rowMainTextWrap}>
                <Text style={styles.rowPrimaryText}>{physicianName}</Text>
              </View>
              <View style={[styles.radioOuter, selected ? styles.radioOuterActive : null]}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>
          );
        })}

        {visiblePhysicians.length === 0 ? (
          <View style={styles.emptyListState}>
            <Text style={styles.emptyListText}>No physicians match your search.</Text>
          </View>
        ) : null}
      </View>
    </>
  );

  const renderStepThree = () => (
    <>
      <View style={styles.selectionBanner}>
        <Feather name="check-square" size={16} color={themeColors.primary} />
        <View style={styles.selectionBannerTextWrap}>
          <Text style={styles.selectionBannerTitle}>{`${selectedService?.name || 'Service'} with ${displayPersonName(selectedPhysician)}`}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>VISIT DATE</Text>
      <Pressable style={styles.wizardPickerCard} onPress={() => setDatePickerTarget('date')}>
        <Text style={styles.wizardPickerText}>{formatWizardDate(selectedDate)}</Text>
        <Feather name="calendar" size={18} color={themeColors.primary} />
      </Pressable>

      <Text style={styles.sectionLabel}>TIME SLOT</Text>
      <View style={styles.timeSlotLabelsRow}>
        <Text style={styles.timeSlotLabel}>Start time</Text>
        <Text style={styles.timeSlotLabel}>End time</Text>
      </View>
      <View style={styles.timeSlotRow}>
        <Pressable style={[styles.wizardPickerCard, styles.timeCard]} onPress={() => setDatePickerTarget('from')}>
          <Text style={styles.wizardPickerText}>{formatWizardTime(scheduledFrom)}</Text>
          <Feather name="clock" size={18} color={themeColors.primary} />
        </Pressable>
        <Pressable style={[styles.wizardPickerCard, styles.timeCard]} onPress={() => setDatePickerTarget('to')}>
          <Text style={styles.wizardPickerText}>{formatWizardTime(scheduledTo)}</Text>
          <Feather name="clock" size={18} color={themeColors.primary} />
        </Pressable>
      </View>
      <Text style={styles.helperText}>Duration set automatically from the selected service · adjust if needed</Text>
    </>
  );

  const renderStepFour = () => (
    <>
      <Text style={styles.sectionLabel}>PATIENT NOTES</Text>
      <TextInput
        style={styles.textArea}
        multiline
        value={patientNotes}
        onChangeText={setPatientNotes}
        placeholder="Clinical notes for this visit"
        placeholderTextColor={themeColors.textSecondary}
      />

      <Text style={styles.sectionLabel}>REFERRED BY</Text>
      <TextInput
        style={styles.textField}
        value={referredBy}
        onChangeText={setReferredBy}
        placeholder="Optional"
        placeholderTextColor={themeColors.textSecondary}
      />

      {visitType === 'Home' ? (
        <>
          <Text style={styles.sectionLabel}>TRAVEL TIME</Text>
          <View style={styles.timeSlotLabelsRow}>
            <Text style={styles.timeSlotLabel}>Onward mins</Text>
            <Text style={styles.timeSlotLabel}>Return mins</Text>
          </View>
          <View style={styles.timeSlotRow}>
            <TextInput
              style={[styles.textField, styles.timeField]}
              value={onwardTravelTimeInMins}
              onChangeText={setOnwardTravelTimeInMins}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={themeColors.textSecondary}
            />
            <TextInput
              style={[styles.textField, styles.timeField]}
              value={returnTravelTimeInMins}
              onChangeText={setReturnTravelTimeInMins}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={themeColors.textSecondary}
            />
          </View>
        </>
      ) : null}

      <Pressable style={styles.generateBillRow} onPress={() => setShouldGenerateBill((value) => !value)}>
        <View style={[styles.checkbox, billingEnabled ? styles.checkboxActive : null]}>
          {billingEnabled ? <Feather name="check" size={12} color={themeColors.textOnBrand} /> : null}
        </View>
        <Text style={styles.generateBillText}>Generate bill for this visit</Text>
      </Pressable>

      <View style={[styles.billingCard, !billingEnabled ? styles.billingCardDisabled : null]}>
        <View style={styles.billingHeaderRow}>
          <View style={styles.billingHeaderLeft}>
            <Feather name="credit-card" size={16} color={themeColors.secondary} />
            <Text style={styles.billingTitle}>Billing details</Text>
          </View>
          <Text style={styles.billingOptionalText}>(optional)</Text>
        </View>

        <Text style={styles.billingFieldLabel}>Advance amount</Text>
        <TextInput
          style={[styles.textField, !billingEnabled ? styles.fieldDisabled : null]}
          value={advanceAmount}
          onChangeText={setAdvanceAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={themeColors.textSecondary}
          editable={billingEnabled}
        />

        <Text style={styles.billingFieldLabel}>Discount (%)</Text>
        <TextInput
          style={[styles.textField, !billingEnabled ? styles.fieldDisabled : null]}
          value={discountInPercentage}
          onChangeText={setDiscountInPercentage}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={themeColors.textSecondary}
          editable={billingEnabled}
        />

        {billingEnabled && Number(advanceAmount || 0) > 0 ? (
          <>
            <Text style={styles.billingFieldLabel}>Payment mode</Text>
            <View style={styles.paymentModeRow}>
              {PAYMENT_MODES.map((mode) => {
                const selected = paymentMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[styles.paymentModeChip, selected ? styles.paymentModeChipActive : null]}
                    onPress={() => setPaymentMode(mode)}
                  >
                    <Text style={[styles.paymentModeChipText, selected ? styles.paymentModeChipTextActive : null]}>{mode}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </View>
    </>
  );

  const showDatePicker = datePickerTarget !== null;

  const renderStepContent = () => {
    if (currentStep === 'visit-patient') {
      return renderStepOne();
    }

    if (currentStep === 'physician') {
      return renderStepTwo();
    }

    if (currentStep === 'schedule') {
      return renderStepThree();
    }

    return renderStepFour();
  };

  const renderSuccessScreen = () => (
    <View style={styles.successScreen}>
      <View style={styles.successCard}>
        <View style={styles.successIconWrap}>
          <Feather name="check-circle" size={34} color={themeColors.primary} />
        </View>
        <Text style={styles.successTitle}>Visit created successfully</Text>
        <Text style={styles.successSubtitle}>The visit is now ready. Choose where you want to go next.</Text>

        <View style={styles.successActions}>
          <Pressable
            accessibilityRole="button"
            style={[styles.footerButton, styles.footerButtonPrimary]}
            onPress={() => {
              if (onViewVisits) {
                onViewVisits();
                return;
              }

              onSaved();
            }}
          >
            <Text style={styles.footerButtonTextPrimary}>Go to Visits</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={[styles.footerButton, styles.footerButtonSecondary]}
            onPress={() => onSaved()}
          >
            <Text style={styles.footerButtonTextSecondary}>Go to Home</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.headerShell, { paddingTop: Math.max(6, insets.top + 4) }]}>
        <View style={styles.topBarRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={onMenuPress} style={styles.topIconButton}>
            <IconButton icon="menu" size={18} iconColor={themeColors.textPrimary} style={styles.topIconButtonInner} />
          </Pressable>
          <View style={styles.brandWrap}>
            <Text numberOfLines={1} style={styles.facilityName}>{facilityName}</Text>
            <Text style={styles.brandSubtitle}>Click Health Pro</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={onProfilePress}>
            <Avatar.Text size={36} label={toInitials(displayName)} style={styles.profileAvatar} labelStyle={styles.profileAvatarLabel} />
          </Pressable>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>New visit</Text>
          <Text style={styles.stepTitle}>{`Step ${currentStepIndex + 1} of 4 · ${STEP_CONFIG[currentStepIndex].title}`}</Text>
        </View>

        <View style={styles.progressRow}>
          {STEP_CONFIG.map((step, index) => (
            <View key={step.key} style={[styles.progressSegment, index <= currentStepIndex ? styles.progressSegmentActive : null]} />
          ))}
        </View>
      </View>

      {visitCreatedSuccessfully ? (
        renderSuccessScreen()
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(120, insets.bottom + 96) }]}>
        {loadingFormData ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={themeColors.primary} />
            <Text style={styles.loadingText}>Loading visit form options...</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {renderStepContent()}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 12) }]}>
            <Pressable
              accessibilityRole="button"
              style={[styles.footerButton, styles.footerButtonSecondary, isFirstStep ? styles.footerButtonDisabled : null]}
              onPress={goToPreviousStep}
              disabled={isFirstStep}
            >
              <Text style={[styles.footerButtonTextSecondary, isFirstStep ? styles.footerButtonTextDisabled : null]}>Back</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.footerButton, styles.footerButtonPrimary, saving ? styles.footerButtonDisabled : null]}
              onPress={goToNextStep}
              disabled={saving}
            >
              <Text style={styles.footerButtonTextPrimary}>{saving ? 'Saving visit...' : isLastStep ? 'Save visit' : `Next: ${STEP_CONFIG[currentStepIndex + 1].title}`}</Text>
            </Pressable>
          </View>

          {showDatePicker ? (
            <DateTimePicker
              value={datePickerTarget === 'date' ? selectedDate : datePickerTarget === 'from' ? scheduledFrom : scheduledTo}
              mode={datePickerTarget === 'date' ? 'date' : 'time'}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateTimeChange}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themeColors.surface,
  },
  headerShell: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: themeColors.surface,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topIconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topIconButtonInner: {
    margin: 0,
  },
  brandWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  facilityName: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  brandSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  profileAvatar: {
    backgroundColor: themeColors.primary,
  },
  profileAvatarLabel: {
    color: themeColors.textOnBrand,
    fontWeight: '700',
  },
  titleBlock: {
    marginTop: 14,
    gap: 4,
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  stepTitle: {
    color: themeColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E7E5E4',
  },
  progressSegmentActive: {
    backgroundColor: themeColors.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#B42318',
    fontSize: 12,
    marginTop: -4,
  },
  sectionLabel: {
    color: '#6C665F',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#EFF3F3',
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: themeColors.primary,
  },
  segmentButtonText: {
    color: '#5F6668',
    fontSize: 14,
    fontWeight: '700',
  },
  segmentButtonTextActive: {
    color: themeColors.textOnBrand,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  searchInput: {
    flex: 1,
    color: themeColors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  selectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#F2F7F7',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectionBannerTextWrap: {
    flex: 1,
  },
  selectionBannerTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  selectionBannerSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  searchResultsWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColors.border,
    overflow: 'hidden',
    backgroundColor: themeColors.surface,
  },
  searchResultRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultPrimaryText: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  resultSecondaryText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  listCard: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 16,
    backgroundColor: themeColors.surface,
    overflow: 'hidden',
  },
  selectableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectableRowActive: {
    backgroundColor: themeColors.successSurface,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F2',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBC6BE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: themeColors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: themeColors.primary,
  },
  rowMainTextWrap: {
    flex: 1,
  },
  rowPrimaryText: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rowMetaText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
    maxWidth: 92,
  },
  physicianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  physicianAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF1E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  physicianAvatarActive: {
    backgroundColor: themeColors.primary,
  },
  physicianAvatarText: {
    color: themeColors.secondary,
    fontSize: 14,
    fontWeight: '800',
  },
  physicianAvatarTextActive: {
    color: themeColors.textOnBrand,
  },
  emptyListState: {
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  emptyListText: {
    color: themeColors.textSecondary,
    fontSize: 13,
  },
  wizardPickerCard: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wizardPickerText: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  timeSlotLabelsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeSlotLabel: {
    flex: 1,
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  timeSlotRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCard: {
    flex: 1,
  },
  helperText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -2,
  },
  textArea: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    color: themeColors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  textField: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    color: themeColors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  timeField: {
    flex: 1,
  },
  generateBillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
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
  generateBillText: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  billingCard: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 16,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  billingCardDisabled: {
    opacity: 0.72,
  },
  billingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billingTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  billingOptionalText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  billingFieldLabel: {
    color: themeColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  fieldDisabled: {
    backgroundColor: '#F5F5F4',
    color: themeColors.textSecondary,
  },
  paymentModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  paymentModeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingVertical: 10,
    alignItems: 'center',
  },
  paymentModeChipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  paymentModeChipText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  paymentModeChipTextActive: {
    color: themeColors.textOnBrand,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#ECE7DF',
    backgroundColor: '#FBFAF8',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonSecondary: {
    flex:1,
    borderWidth: 1,
    borderColor: '#E2D9CD',
    backgroundColor: themeColors.surface,
  },
  footerButtonPrimary: {
    flex: 1,
    backgroundColor: themeColors.primary,
  },
  footerButtonDisabled: {
    opacity: 0.45,
  },
  footerButtonTextSecondary: {
    color: '#7E7A73',
    fontSize: 16,
    fontWeight: '700',
  },
  footerButtonTextDisabled: {
    color: '#B6B0A8',
  },
  footerButtonTextPrimary: {
    color: themeColors.textOnBrand,
    fontSize: 16,
    fontWeight: '800',
  },
  successScreen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  successCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColors.successBorder,
    backgroundColor: themeColors.successSurface,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 10,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: themeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.successBorder,
    marginBottom: 6,
  },
  successTitle: {
    color: themeColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  successSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  successActions: {
    width: '100%',
    gap: 10,
    marginTop: 10,
    flexDirection: 'row',
    flex:1
  },
});
