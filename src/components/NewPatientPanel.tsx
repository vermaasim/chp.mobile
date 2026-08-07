import { useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';
import { createPatient } from '../api/patients';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { allStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import { formatDateInput } from '../utils/dateRangeFilter';
import type { PatientCreatePayload } from '../types/patients';

interface NewPatientPanelProps {
  token: string;
  facilityId: string;
  facilityName: string;
  displayName: string;
  onProfilePress: () => void;
  onClose: () => void;
  onViewPatients?: () => void;
  onSaved: () => void;
}

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Baby'];
const GENDERS = ['Male', 'Female', 'Other', 'Unknown'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const NATIONAL_ID_TYPES = ['Aadhaar', 'PAN Card', 'Passport', 'Driving License', 'Government Employee Id'];
const STEP_CONFIG = [
  { key: 'basic-details', title: 'Basic details' },
  { key: 'address', title: 'Address' },
  { key: 'emergency-contact', title: 'Emergency contact' },
  { key: 'identifier', title: 'Identifier' },
] as const;

type PatientStepKey = (typeof STEP_CONFIG)[number]['key'];

type PatientFormState = {
  prefix: string;
  firstName: string;
  lastName: string;
  ageInYears: string;
  gender: string;
  dateOfBirth: string;
  maritalStatus: string;
  bloodGroup: string;
  mobileNo: string;
  emailId: string;
  emergencyContactPerson: string;
  emergencyContactRelationship: string;
  emergencyContactPhoneNumber: string;
  addressHouseNo: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressPIN: string;
  addressCountry: string;
  nationalIdType: string;
  nationalId: string;
};

const INITIAL_FORM: PatientFormState = {
  prefix: 'Mr.',
  firstName: '',
  lastName: '',
  ageInYears: '0',
  gender: 'Male',
  dateOfBirth: formatDateInput(new Date()),
  maritalStatus: '',
  bloodGroup: '',
  mobileNo: '',
  emailId: '',
  emergencyContactPerson: '',
  emergencyContactRelationship: '',
  emergencyContactPhoneNumber: '',
  addressHouseNo: '',
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressPIN: '',
  addressCountry: 'India',
  nationalIdType: '',
  nationalId: '',
};

function isValidIndianPhone(value: string) {
  return /^[6-9]\d{9}$/.test(value.trim());
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

function calculateAgeFromDob(dobValue: string) {
  const parsed = new Date(`${dobValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const today = new Date();
  let years = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  const hasBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= parsed.getDate());
  if (!hasBirthdayPassed) {
    years -= 1;
  }

  return `${Math.max(0, years)}`;
}

function calculateDobFromAge(ageValue: string) {
  const years = Number(ageValue);
  if (!Number.isFinite(years) || years < 0) {
    return formatDateInput(new Date());
  }

  const today = new Date();
  const dob = new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
  return formatDateInput(dob);
}

function buildPayload(form: PatientFormState, facilityId: string): PatientCreatePayload {
  return {
    facilityId,
    prefix: form.prefix.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    gender: form.gender,
    dateOfBirth: form.dateOfBirth,
    mobileNo: form.mobileNo.trim(),
    emailId: form.emailId.trim() || null,
    emergencyContactPerson: form.emergencyContactPerson.trim() || undefined,
    emergencyContactRelationship: form.emergencyContactRelationship.trim() || undefined,
    emergencyContactPhoneNumber: form.emergencyContactPhoneNumber.trim() || undefined,
    addressHouseNo: form.addressHouseNo.trim() || undefined,
    addressStreet: form.addressStreet.trim() || undefined,
    addressCity: form.addressCity.trim() || undefined,
    addressState: form.addressState.trim() || undefined,
    addressPIN: form.addressPIN.trim() || undefined,
    addressCountry: form.addressCountry.trim() || undefined,
    bloodGroup: form.bloodGroup.trim() || undefined,
    maritalStatus: form.maritalStatus.trim() || undefined,
    nationalIdType: form.nationalIdType.trim() || undefined,
    nationalId: form.nationalId.trim() || undefined,
  };
}

export function NewPatientPanel({
  token,
  facilityId,
  facilityName,
  displayName,
  onProfilePress,
  onClose,
  onViewPatients,
  onSaved,
}: NewPatientPanelProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const [form, setForm] = useState<PatientFormState>(INITIAL_FORM);
  const [currentStep, setCurrentStep] = useState<PatientStepKey>('basic-details');
  const [patientCreatedSuccessfully, setPatientCreatedSuccessfully] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const currentStepIndex = STEP_CONFIG.findIndex((step) => step.key === currentStep);
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex === STEP_CONFIG.length - 1;

  const requiredMissing = useMemo(
    () => !form.prefix || !form.firstName.trim() || !form.lastName.trim() || !form.gender || !form.dateOfBirth || !form.mobileNo.trim(),
    [form],
  );

  const setField = <K extends keyof PatientFormState>(key: K, value: PatientFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setDateOfBirth = (dobValue: string) => {
    setForm((current) => ({
      ...current,
      dateOfBirth: dobValue,
      ageInYears: calculateAgeFromDob(dobValue),
    }));
  };

  const setAgeInYears = (ageValue: string) => {
    const sanitized = ageValue.replace(/[^\d]/g, '').slice(0, 3);
    if (!sanitized) {
      setForm((current) => ({ ...current, ageInYears: '', dateOfBirth: formatDateInput(new Date()) }));
      return;
    }

    setForm((current) => ({
      ...current,
      ageInYears: sanitized,
      dateOfBirth: calculateDobFromAge(sanitized),
    }));
  };

  const onDateChange = (event: DateTimePickerEvent, value?: Date) => {
    if (event.type === 'dismissed') {
      setDatePickerVisible(false);
      return;
    }

    if (value) {
      setDateOfBirth(formatDateInput(value));
    }

    if (Platform.OS === 'android') {
      setDatePickerVisible(false);
    }
  };

  const validate = () => {
    if (requiredMissing) {
      return 'Please fill all required patient fields.';
    }

    if (!isValidIndianPhone(form.mobileNo)) {
      return 'Please enter a valid 10-digit mobile number.';
    }

    if (!form.ageInYears.trim()) {
      return 'Please provide age or date of birth.';
    }

    if (form.emergencyContactPhoneNumber && !isValidIndianPhone(form.emergencyContactPhoneNumber)) {
      return 'Please enter a valid 10-digit emergency contact number.';
    }

    if (form.emergencyContactPhoneNumber && form.emergencyContactPhoneNumber.trim() === form.mobileNo.trim()) {
      return 'Patient mobile number and emergency contact number cannot be the same.';
    }

    const hasOnlyIdType = form.nationalIdType.trim() && !form.nationalId.trim();
    const hasOnlyIdNumber = !form.nationalIdType.trim() && form.nationalId.trim();
    if (hasOnlyIdType || hasOnlyIdNumber) {
      return 'Please fill both identifier type and identifier number.';
    }

    return null;
  };

  const validateStep = (step: PatientStepKey) => {
    if (step === 'basic-details') {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.mobileNo.trim()) {
        return 'Please complete all required basic details.';
      }

      if (!isValidIndianPhone(form.mobileNo)) {
        return 'Please enter a valid 10-digit mobile number.';
      }

      return null;
    }

    if (step === 'emergency-contact') {
      if (form.emergencyContactPhoneNumber && !isValidIndianPhone(form.emergencyContactPhoneNumber)) {
        return 'Please enter a valid 10-digit emergency contact number.';
      }

      return null;
    }

    if (step === 'identifier') {
      const hasOnlyIdType = form.nationalIdType.trim() && !form.nationalId.trim();
      const hasOnlyIdNumber = !form.nationalIdType.trim() && form.nationalId.trim();
      if (hasOnlyIdType || hasOnlyIdNumber) {
        return 'Please fill both identifier type and identifier number.';
      }

      return null;
    }

    return null;
  };

  const savePatient = async () => {
    const validationMessage = validate();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await createPatient(token, buildPayload(form, facilityId));
      setPatientCreatedSuccessfully(true);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create patient.');
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
      void savePatient();
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
      <Text style={styles.sectionLabel}>PREFIX</Text>
      <View style={styles.chipRow}>
        {PREFIXES.map((prefix) => {
          const selected = form.prefix === prefix;
          return (
            <Pressable
              key={prefix}
              accessibilityRole="button"
              style={[styles.choiceChip, selected ? styles.choiceChipActive : null]}
              onPress={() => setField('prefix', prefix)}
            >
              <Text style={[styles.choiceChipText, selected ? styles.choiceChipTextActive : null]}>{prefix}</Text>
            </Pressable>
          );
        })}
      </View>

      <InputLabel label="First name" required />
      <TextInput
        value={form.firstName}
        onChangeText={(value) => setField('firstName', value)}
        style={styles.textField}
        placeholder="Enter first name"
        placeholderTextColor={themeColors.textSecondary}
      />

      <InputLabel label="Last name" required />
      <TextInput
        value={form.lastName}
        onChangeText={(value) => setField('lastName', value)}
        style={styles.textField}
        placeholder="Enter last name"
        placeholderTextColor={themeColors.textSecondary}
      />

      <View style={styles.dualFieldRow}>
        <View style={styles.dualFieldItem}>
          <InputLabel label="Date of birth" required />
          <Pressable accessibilityRole="button" onPress={() => setDatePickerVisible(true)} style={styles.wizardPickerCard}>
            <Text style={styles.wizardPickerText}>{form.dateOfBirth}</Text>
            <Feather name="calendar" size={18} color={themeColors.primary} />
          </Pressable>
        </View>
        <View style={styles.dualFieldItem}>
          <InputLabel label="Age" required />
          <TextInput
            value={form.ageInYears}
            onChangeText={setAgeInYears}
            style={styles.textField}
            keyboardType="number-pad"
            placeholder="Years"
            placeholderTextColor={themeColors.textSecondary}
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>GENDER</Text>
      <View style={styles.chipRow}>
        {GENDERS.map((gender) => {
          const selected = form.gender === gender;
          return (
            <Pressable
              key={gender}
              accessibilityRole="button"
              style={[styles.choiceChip, selected ? styles.choiceChipActive : null]}
              onPress={() => setField('gender', gender)}
            >
              <Text style={[styles.choiceChipText, selected ? styles.choiceChipTextActive : null]}>{gender}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>MARITAL STATUS</Text>
      <View style={styles.chipRow}>
        {MARITAL_STATUSES.map((status) => {
          const selected = form.maritalStatus === status;
          return (
            <Pressable
              key={status}
              accessibilityRole="button"
              style={[styles.choiceChip, selected ? styles.choiceChipActive : null]}
              onPress={() => setField('maritalStatus', status)}
            >
              <Text style={[styles.choiceChipText, selected ? styles.choiceChipTextActive : null]}>{status}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>BLOOD GROUP</Text>
      <View style={styles.chipRow}>
        {BLOOD_GROUPS.map((group) => {
          const selected = form.bloodGroup === group;
          return (
            <Pressable
              key={group}
              accessibilityRole="button"
              style={[styles.choiceChip, selected ? styles.choiceChipActive : null]}
              onPress={() => setField('bloodGroup', group)}
            >
              <Text style={[styles.choiceChipText, selected ? styles.choiceChipTextActive : null]}>{group}</Text>
            </Pressable>
          );
        })}
      </View>

      <InputLabel label="Email Id" />
      <TextInput
        value={form.emailId}
        onChangeText={(value) => setField('emailId', value)}
        style={styles.textField}
        keyboardType="email-address"
        placeholder="name@example.com"
        placeholderTextColor={themeColors.textSecondary}
      />

      <InputLabel label="Mobile Number" required />
      <TextInput
        value={form.mobileNo}
        onChangeText={(value) => setField('mobileNo', value.replace(/[^\d]/g, '').slice(0, 10))}
        style={styles.textField}
        keyboardType="phone-pad"
        placeholder="10-digit mobile number"
        placeholderTextColor={themeColors.textSecondary}
      />
    </>
  );

  const renderStepTwo = () => (
    <>
      <InputLabel label="House No" />
      <TextInput
        value={form.addressHouseNo}
        onChangeText={(value) => setField('addressHouseNo', value)}
        style={styles.textField}
        placeholder="House / Flat no"
        placeholderTextColor={themeColors.textSecondary}
      />

      <InputLabel label="Street" />
      <TextInput
        value={form.addressStreet}
        onChangeText={(value) => setField('addressStreet', value)}
        style={styles.textField}
        placeholder="Street"
        placeholderTextColor={themeColors.textSecondary}
      />

      <InputLabel label="City" />
      <TextInput
        value={form.addressCity}
        onChangeText={(value) => setField('addressCity', value)}
        style={styles.textField}
        placeholder="City"
        placeholderTextColor={themeColors.textSecondary}
      />

      <InputLabel label="State" />
      <TextInput
        value={form.addressState}
        onChangeText={(value) => setField('addressState', value)}
        style={styles.textField}
        placeholder="State"
        placeholderTextColor={themeColors.textSecondary}
      />

      <InputLabel label="Country" />
      <TextInput
        value={form.addressCountry}
        onChangeText={(value) => setField('addressCountry', value)}
        style={styles.textField}
        placeholder="Country"
        placeholderTextColor={themeColors.textSecondary}
      />

      <InputLabel label="Pin Code" />
      <TextInput
        value={form.addressPIN}
        onChangeText={(value) => setField('addressPIN', value.replace(/[^\d]/g, '').slice(0, 6))}
        style={styles.textField}
        keyboardType="number-pad"
        placeholder="6-digit PIN"
        placeholderTextColor={themeColors.textSecondary}
      />
    </>
  );

  const renderStepThree = () => (
    <>
      <InputLabel label="Name" />
      <TextInput
        value={form.emergencyContactPerson}
        onChangeText={(value) => setField('emergencyContactPerson', value)}
        style={styles.textField}
        placeholder="Contact person"
        placeholderTextColor={themeColors.textSecondary}
      />

      <InputLabel label="Phone" />
      <TextInput
        value={form.emergencyContactPhoneNumber}
        onChangeText={(value) => setField('emergencyContactPhoneNumber', value.replace(/[^\d]/g, '').slice(0, 10))}
        style={styles.textField}
        keyboardType="phone-pad"
        placeholder="10-digit number"
        placeholderTextColor={themeColors.textSecondary}
      />

      <InputLabel label="Relationship" />
      <TextInput
        value={form.emergencyContactRelationship}
        onChangeText={(value) => setField('emergencyContactRelationship', value)}
        style={styles.textField}
        placeholder="Relationship"
        placeholderTextColor={themeColors.textSecondary}
      />
    </>
  );

  const renderStepFour = () => (
    <>
      <Text style={styles.sectionLabel}>NATIONAL ID TYPE</Text>
      <View style={styles.listCard}>
        {NATIONAL_ID_TYPES.map((idType, index) => {
          const selected = form.nationalIdType === idType;
          return (
            <Pressable
              key={idType}
              style={[styles.selectableRow, selected ? styles.selectableRowActive : null, index < NATIONAL_ID_TYPES.length - 1 ? styles.rowDivider : null]}
              onPress={() => setField('nationalIdType', idType)}
            >
              <View style={[styles.radioOuter, selected ? styles.radioOuterActive : null]}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.rowPrimaryText}>{idType}</Text>
            </Pressable>
          );
        })}
      </View>

      <InputLabel label="Id Number" />
      <TextInput
        value={form.nationalId}
        onChangeText={(value) => setField('nationalId', value)}
        style={styles.textField}
        placeholder="Identifier value"
        placeholderTextColor={themeColors.textSecondary}
      />
    </>
  );

  const renderStepContent = () => {
    if (currentStep === 'basic-details') {
      return renderStepOne();
    }

    if (currentStep === 'address') {
      return renderStepTwo();
    }

    if (currentStep === 'emergency-contact') {
      return renderStepThree();
    }

    return renderStepFour();
  };

  const renderSuccessScreen = () => (
    <View style={styles.successScreen}>
      <View style={[styles.successCard, layout.formMaxWidth ? { maxWidth: layout.formMaxWidth } : null]}>
        <View style={styles.successIconWrap}>
          <Feather name="check-circle" size={34} color={themeColors.primary} />
        </View>
        <Text style={styles.successTitle}>Patient created successfully</Text>
        <Text style={styles.successSubtitle}>The patient profile is ready. Choose where you want to go next.</Text>

        <View style={styles.successActions}>
          <Pressable
            accessibilityRole="button"
            style={[styles.footerButton, styles.footerButtonPrimary]}
            onPress={() => {
              if (onViewPatients) {
                onViewPatients();
                return;
              }

              onSaved();
            }}
          >
            <Text style={styles.footerButtonTextPrimary}>Go to Patients</Text>
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
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={allStyles.modalScreen}>
        <View style={[allStyles.modalHeader, { paddingTop: Math.max(16, insets.top + 8) }]}>
          <View style={[styles.headerTextWrap, layout.formMaxWidth ? { maxWidth: layout.formMaxWidth } : null]}>
            <Text style={allStyles.modalTitle}>New patient</Text>
            <Text numberOfLines={1} style={styles.headerSubtitle}>{facilityName}</Text>
          </View>
          <IconButton accessibilityLabel="Close new patient" icon="close" size={20} iconColor={themeColors.textSecondary} onPress={onClose} style={styles.closeButton} />
        </View>

        {patientCreatedSuccessfully ? (
          renderSuccessScreen()
        ) : (
          <>
            <ScrollView
              style={allStyles.modalScroll}
              contentContainerStyle={[allStyles.modalBodyWithFooter, { paddingBottom: Math.max(layout.footerReserve, insets.bottom + 20) }]}
            >
              <View style={[styles.formContainer, layout.formMaxWidth ? { maxWidth: layout.formMaxWidth } : null]}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>{`Step ${currentStepIndex + 1} of 4 · ${STEP_CONFIG[currentStepIndex].title}`}</Text>
                  <View style={styles.progressRow}>
                    {STEP_CONFIG.map((step, index) => (
                      <View key={step.key} style={[styles.progressSegment, index <= currentStepIndex ? styles.progressSegmentActive : null]} />
                    ))}
                  </View>
                </View>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                {renderStepContent()}
              </View>
            </ScrollView>

            <View style={[allStyles.modalFooter, { paddingBottom: Math.max(14, insets.bottom + 14) }]}>
              <View style={[styles.footerInner, layout.formMaxWidth ? { maxWidth: layout.formMaxWidth } : null]}>
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
                  <Text style={styles.footerButtonTextPrimary}>{saving ? 'Saving patient...' : isLastStep ? 'Save patient' : `Next: ${STEP_CONFIG[currentStepIndex + 1].title}`}</Text>
                </Pressable>
              </View>
            </View>

            {datePickerVisible ? (
              <DateTimePicker
                value={new Date(`${form.dateOfBirth}T00:00:00`)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={onDateChange}
              />
            ) : null}
          </>
        )}
      </View>
    </Modal>
  );
}

function InputLabel({ label, required }: {
  label: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required ? <Text style={styles.requiredStar}> *</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themeColors.surface,
  },
  headerShell: {
    paddingBottom: 8,
    backgroundColor: themeColors.surface,
  },
  headerInner: {
    width: '100%',
    alignSelf: 'center',
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topLogoWrap: {
    width: 108,
    minHeight: 38,
    justifyContent: 'center',
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
  closeButton: {
    margin: 0,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
    paddingRight: 12,
  },
  headerSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  stepHeader: {
    gap: 4,
    marginBottom: 2,
  },
  titleBlock: {
    marginTop: 14,
    gap: 4,
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  stepTitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
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
    paddingTop: 8,
    gap: 12,
  },
  formContainer: {
    width: '100%',
    alignSelf: 'center',
    gap: 12,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: themeColors.surface,
  },
  choiceChipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  choiceChipText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  choiceChipTextActive: {
    color: themeColors.textOnBrand,
  },
  fieldLabel: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  requiredStar: {
    color: '#B42318',
  },
  dualFieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dualFieldItem: {
    flex: 1,
  },
  wizardPickerCard: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wizardPickerText: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  textField: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    color: themeColors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  listCard: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    backgroundColor: themeColors.surface,
    overflow: 'hidden',
  },
  selectableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    paddingVertical: 8,
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
  rowPrimaryText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#ECE7DF',
    backgroundColor: '#FBFAF8',
    paddingTop: 12,
  },
  footerInner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonSecondary: {
    flex: 1,
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
    fontSize: 14,
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
    width: '100%',
    alignSelf: 'center',
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
    flex: 1,
  },
});