import { useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createPatient } from '../api/patients';
import { allStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import { formatDateInput } from '../utils/dateRangeFilter';
import type { PatientCreatePayload } from '../types/patients';

interface NewPatientPanelProps {
  token: string;
  facilityId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Baby'];
const GENDERS = ['Male', 'Female', 'Other', 'Unknown'];

type PatientFormState = {
  prefix: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
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
};

const INITIAL_FORM: PatientFormState = {
  prefix: 'Mr.',
  firstName: '',
  lastName: '',
  gender: 'Male',
  dateOfBirth: formatDateInput(new Date()),
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
};

function isValidIndianPhone(value: string) {
  return /^[6-9]\d{9}$/.test(value.trim());
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
  };
}

export function NewPatientPanel({ token, facilityId, onSaved, onCancel }: NewPatientPanelProps) {
  const [form, setForm] = useState<PatientFormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const requiredMissing = useMemo(() => {
    return !form.prefix || !form.firstName.trim() || !form.lastName.trim() || !form.gender || !form.dateOfBirth || !form.mobileNo.trim();
  }, [form]);

  const setField = <K extends keyof PatientFormState>(key: K, value: PatientFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onDateChange = (event: DateTimePickerEvent, value?: Date) => {
    if (event.type === 'dismissed') {
      setDatePickerVisible(false);
      return;
    }

    if (value) {
      setField('dateOfBirth', formatDateInput(value));
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

    if (form.emergencyContactPhoneNumber && !isValidIndianPhone(form.emergencyContactPhoneNumber)) {
      return 'Please enter a valid 10-digit emergency contact number.';
    }

    if (form.emergencyContactPhoneNumber && form.emergencyContactPhoneNumber.trim() === form.mobileNo.trim()) {
      return 'Patient mobile number and emergency contact number cannot be the same.';
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
      onSaved();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create patient.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void savePatient()}
          style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]}
        >
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Patient'}</Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={allStyles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.sectionCard}>
        <Text style={allStyles.sectionTitle}>Patient Details</Text>
        <Text style={allStyles.sectionSubtitle}>Required profile fields used by the web create flow.</Text>

        <Text style={allStyles.label}>Prefix</Text>
        <View style={styles.chipRow}>
          {PREFIXES.map((prefix) => {
            const selected = form.prefix === prefix;
            return (
              <Pressable
                key={prefix}
                accessibilityRole="button"
                onPress={() => setField('prefix', prefix)}
                style={[allStyles.typeChip, selected ? allStyles.typeChipActive : null]}
              >
                <Text style={[allStyles.typeChipText, selected ? allStyles.typeChipTextActive : null]}>{prefix}</Text>
              </Pressable>
            );
          })}
        </View>

        <LabeledInput label="First Name" value={form.firstName} onChangeText={(value) => setField('firstName', value)} />
        <LabeledInput label="Last Name" value={form.lastName} onChangeText={(value) => setField('lastName', value)} />

        <Text style={allStyles.label}>Gender</Text>
        <View style={styles.chipRow}>
          {GENDERS.map((gender) => {
            const selected = form.gender === gender;
            return (
              <Pressable
                key={gender}
                accessibilityRole="button"
                onPress={() => setField('gender', gender)}
                style={[allStyles.typeChip, selected ? allStyles.typeChipActive : null]}
              >
                <Text style={[allStyles.typeChipText, selected ? allStyles.typeChipTextActive : null]}>{gender}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={allStyles.label}>Date of Birth</Text>
        <Pressable accessibilityRole="button" onPress={() => setDatePickerVisible(true)} style={allStyles.datePickerButton}>
          <Text style={allStyles.datePickerText}>{form.dateOfBirth}</Text>
          <Feather name="calendar" size={14} color={themeColors.primary} />
        </Pressable>

        <LabeledInput label="Mobile Number" value={form.mobileNo} keyboardType="phone-pad" onChangeText={(value) => setField('mobileNo', value.replace(/[^\d]/g, '').slice(0, 10))} />
        <LabeledInput label="Email" value={form.emailId} keyboardType="email-address" onChangeText={(value) => setField('emailId', value)} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={allStyles.sectionTitle}>Emergency Contact</Text>
        <LabeledInput label="Contact Person" value={form.emergencyContactPerson} onChangeText={(value) => setField('emergencyContactPerson', value)} />
        <LabeledInput label="Relationship" value={form.emergencyContactRelationship} onChangeText={(value) => setField('emergencyContactRelationship', value)} />
        <LabeledInput
          label="Contact Number"
          value={form.emergencyContactPhoneNumber}
          keyboardType="phone-pad"
          onChangeText={(value) => setField('emergencyContactPhoneNumber', value.replace(/[^\d]/g, '').slice(0, 10))}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={allStyles.sectionTitle}>Address</Text>
        <LabeledInput label="House No." value={form.addressHouseNo} onChangeText={(value) => setField('addressHouseNo', value)} />
        <LabeledInput label="Street" value={form.addressStreet} onChangeText={(value) => setField('addressStreet', value)} />
        <LabeledInput label="City" value={form.addressCity} onChangeText={(value) => setField('addressCity', value)} />
        <LabeledInput label="State" value={form.addressState} onChangeText={(value) => setField('addressState', value)} />
        <LabeledInput label="PIN" value={form.addressPIN} keyboardType="number-pad" onChangeText={(value) => setField('addressPIN', value.replace(/[^\d]/g, '').slice(0, 6))} />
        <LabeledInput label="Country" value={form.addressCountry} onChangeText={(value) => setField('addressCountry', value)} />
      </View>

      {datePickerVisible ? (
        <DateTimePicker value={new Date(`${form.dateOfBirth}T00:00:00`)} mode="date" display="default" maximumDate={new Date()} onChange={onDateChange} />
      ) : null}
    </ScrollView>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View>
      <Text style={allStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={allStyles.input}
        placeholderTextColor={themeColors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: 10,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    padding: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButtonText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: themeColors.textOnBrand,
    fontSize: 13,
    fontWeight: '700',
  },
});