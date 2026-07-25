import { Pressable, Text, TextInput, View } from 'react-native';
import { themeColors } from '../../../theme/colors';
import {
  type GeneralPrescriptionMedicine,
  type GeneralPrescriptionTest,
  type SelectableComorbidity,
} from '../../../data/generalPrescription';
import {
  GENERAL_PRESCRIPTION_SUGGESTIONS,
  getTopSuggestions,
} from '../../../data/generalPrescriptionSuggestions';
import type { RegenerationContextTextType } from '../../../api/textRegeneration';
import { allStyles } from '../../../styles/commonStyles';
import { SpeechEnabledMultilineInput } from '../../SpeechEnabledMultilineInput';

type PrescriptionStatus = 'Draft' | 'Final';

const STATUS_VALUES: PrescriptionStatus[] = ['Draft', 'Final'];

type GeneralRxFormProps = {
  token: string;
  facilityId: string;
  prescriptionStatus: PrescriptionStatus;
  setPrescriptionStatus: (status: PrescriptionStatus) => void;
  weight: string;
  setWeight: (value: string) => void;
  bloodPressure: string;
  setBloodPressure: (value: string) => void;
  temprature: string;
  setTemprature: (value: string) => void;
  bloodSugar: string;
  setBloodSugar: (value: string) => void;
  generalRxComplaint: string;
  setGeneralRxComplaint: (value: string) => void;
  comorbidities: SelectableComorbidity[];
  toggleComorbidity: (value: string) => void;
  comorbiditiesNotes: string;
  setComorbiditiesNotes: (value: string) => void;
  medicalAndSurgicalHistory: string;
  setMedicalAndSurgicalHistory: (value: string) => void;
  generalRxDiagnosis: string;
  setGeneralRxDiagnosis: (value: string) => void;
  currentMedicine: GeneralPrescriptionMedicine;
  updateCurrentMedicine: (key: keyof Omit<GeneralPrescriptionMedicine, 'serialNo'>, value: string) => void;
  generalRxMedicines: GeneralPrescriptionMedicine[];
  addMedicine: () => void;
  updateMedicine: (serialNo: number, key: keyof Omit<GeneralPrescriptionMedicine, 'serialNo'>, value: string) => void;
  removeMedicine: (serialNo: number) => void;
  currentTest: GeneralPrescriptionTest;
  updateCurrentTest: (key: keyof Omit<GeneralPrescriptionTest, 'serialNo'>, value: string) => void;
  generalRxTests: GeneralPrescriptionTest[];
  addTest: () => void;
  updateTest: (serialNo: number, key: keyof Omit<GeneralPrescriptionTest, 'serialNo'>, value: string) => void;
  removeTest: (serialNo: number) => void;
  generalRxAdditionalNotes: string;
  setGeneralRxAdditionalNotes: (value: string) => void;
  generalRxFollowupDate: string;
  setGeneralRxFollowupDate: (value: string) => void;
};

type SuggestionChipsProps = {
  options: string[];
  recentValues?: string[];
  query: string;
  onSelect: (value: string) => void;
};

function SuggestionChips({ options, recentValues, query, onSelect }: SuggestionChipsProps) {
  const suggestions = getTopSuggestions({ catalog: options, recentValues, query, limit: 5 });

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={allStyles.typeRow}>
      {suggestions.map((item) => (
        <Pressable key={item} style={styles.suggestionChip} onPress={() => onSelect(item)}>
          <Text style={styles.suggestionText}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function GeneralRxForm(props: GeneralRxFormProps) {
  const recentMedicineNames = [...props.generalRxMedicines].reverse().map((item) => item.name);
  const recentMedicineDosages = [...props.generalRxMedicines].reverse().map((item) => item.dosage);
  const recentMedicineDurations = [...props.generalRxMedicines].reverse().map((item) => item.duration);
  const recentMedicineFrequencies = [...props.generalRxMedicines].reverse().map((item) => item.frequency);
  const recentMedicineInstructions = [...props.generalRxMedicines].reverse().map((item) => item.instructions);
  const recentTestNames = [...props.generalRxTests].reverse().map((item) => item.name);
  const recentTestInstructions = [...props.generalRxTests].reverse().map((item) => item.instructions);

  const withAiContext = (
    textType: RegenerationContextTextType,
    clinicalContext: string,
    styleHints: string,
  ) => ({
    token: props.token,
    facilityId: props.facilityId,
    regenerationContext: {
      textType,
      clinicalContext,
      styleHints,
    },
  });

  return (
    <>
      <Text style={allStyles.label}>Status</Text>
      <View style={allStyles.typeRow}>
        {STATUS_VALUES.map((status) => (
          <Pressable
            key={status}
            style={[
              allStyles.typeChip,
              props.prescriptionStatus === status
                ? allStyles.typeChipActive
                : null,
            ]}
            onPress={() => props.setPrescriptionStatus(status)}
          >
            <Text
              style={[
                allStyles.typeChipText,
                props.prescriptionStatus === status
                  ? allStyles.typeChipTextActive
                  : null,
              ]}
            >
              {status}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <View style={{ flex: 1 }}>
          <Text style={allStyles.label}>Weight</Text>
          <TextInput
            value={props.weight}
            onChangeText={props.setWeight}
            style={allStyles.input}
            placeholder="e.g. 70 kg"
          />
        </View>
        <View style={{ flex: 1 }}>
        <Text style={allStyles.label}>Blood Pressure</Text>
        <TextInput
          value={props.bloodPressure}
          onChangeText={props.setBloodPressure}
          style={allStyles.input}
          placeholder="e.g. 120/80"
        />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>

      <View style={{ flex: 1 }}>
        <Text style={allStyles.label}>Temprature</Text>
        <TextInput
          value={props.temprature}
          onChangeText={props.setTemprature}
          style={allStyles.input}
          placeholder="e.g. 98.6 F"
        />
      </View>
      <View style={{ flex: 1 }}>
    
      <Text style={allStyles.label}>Blood Sugar</Text>
      <TextInput
        value={props.bloodSugar}
        onChangeText={props.setBloodSugar}
        style={allStyles.input}
        placeholder="e.g. 95 mg/dL"
      />
        </View>
        </View>
      <Text style={allStyles.label}>Chief Complaint</Text>
      <SpeechEnabledMultilineInput
        value={props.generalRxComplaint}
        onChangeText={props.setGeneralRxComplaint}
        numberOfLines={3}
        {...withAiContext('complaint', 'General prescription chief complaint.', 'Use concise professional clinical phrasing.')}
      />

      <Text style={allStyles.label}>Comorbidities</Text>
      <View style={allStyles.typeRow}>
        {props.comorbidities.map((item) => (
          <Pressable
            key={item.value}
            style={[
              allStyles.typeChip,
              item.selected ? allStyles.typeChipActive : null,
            ]}
            onPress={() => props.toggleComorbidity(item.value)}
          >
            <Text
              style={[
                allStyles.typeChipText,
                item.selected ? allStyles.typeChipTextActive : null,
              ]}
            >
              {item.displayValue}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={allStyles.label}>Comorbidities Notes</Text>
      <SpeechEnabledMultilineInput
        value={props.comorbiditiesNotes}
        onChangeText={props.setComorbiditiesNotes}
        numberOfLines={3}
        {...withAiContext('assessment', 'General prescription comorbidities notes.', 'Use concise comorbidity-oriented clinical wording.')}
      />

      <Text style={allStyles.label}>Medical and Surgical History</Text>
      <SpeechEnabledMultilineInput
        value={props.medicalAndSurgicalHistory}
        onChangeText={props.setMedicalAndSurgicalHistory}
        numberOfLines={3}
        {...withAiContext('assessment', 'General prescription medical and surgical history.', 'Use structured history-oriented phrasing.')}
      />

      <Text style={allStyles.label}>Diagnosis</Text>
      <SpeechEnabledMultilineInput
        value={props.generalRxDiagnosis}
        onChangeText={props.setGeneralRxDiagnosis}
        numberOfLines={3}
        {...withAiContext('assessment', 'General prescription diagnosis.', 'Use concise diagnosis-focused clinical tone.')}
      />

      <Text style={allStyles.label}>Medicines</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Medicine</Text>

        <Text style={allStyles.label}>Medicine Name</Text>
        <TextInput
          value={props.currentMedicine.name}
          onChangeText={(value) => props.updateCurrentMedicine('name', value)}
          style={allStyles.input}
          placeholder="Search or type medicine"
        />
        <SuggestionChips
          options={GENERAL_PRESCRIPTION_SUGGESTIONS.medicines}
          recentValues={recentMedicineNames}
          query={props.currentMedicine.name}
          onSelect={(value) => props.updateCurrentMedicine('name', value)}
        />

        <Text style={allStyles.label}>Frequency</Text>
        <TextInput
          value={props.currentMedicine.frequency}
          onChangeText={(value) => props.updateCurrentMedicine('frequency', value)}
          style={allStyles.input}
          placeholder="e.g. BD"
        />
        <SuggestionChips
          options={GENERAL_PRESCRIPTION_SUGGESTIONS.frequencies}
          recentValues={recentMedicineFrequencies}
          query={props.currentMedicine.frequency}
          onSelect={(value) => props.updateCurrentMedicine('frequency', value)}
        />

        <Text style={allStyles.label}>Instructions</Text>
        <SpeechEnabledMultilineInput
          value={props.currentMedicine.instructions}
          onChangeText={(value) => props.updateCurrentMedicine('instructions', value)}
          numberOfLines={2}
          {...withAiContext('treatment', 'Medicine instructions in general prescription.', 'Use clear, patient-friendly treatment instructions.')}
        />
        <SuggestionChips
          options={GENERAL_PRESCRIPTION_SUGGESTIONS.medicineInstructions}
          recentValues={recentMedicineInstructions}
          query={props.currentMedicine.instructions}
          onSelect={(value) => props.updateCurrentMedicine('instructions', value)}
        />

        <View style={styles.sectionActions}>
          <Pressable style={styles.addButton} onPress={props.addMedicine}>
            <Text style={styles.addButtonText}>Add Medicine</Text>
          </Pressable>
        </View>
      </View>

      {props.generalRxMedicines.length > 0 ? <Text style={styles.listHeading}>Medicine List</Text> : null}
      {props.generalRxMedicines.map((medicine) => (
        <View key={`medicine-${medicine.serialNo}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Medicine #{medicine.serialNo}</Text>
            <Pressable style={styles.removeButton} onPress={() => props.removeMedicine(medicine.serialNo)}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          </View>
          <Text style={styles.summaryLine}>Name: {medicine.name || '-'}</Text>
          <Text style={styles.summaryLine}>Dosage: {medicine.dosage || '-'}</Text>
          <Text style={styles.summaryLine}>Duration: {medicine.duration || '-'}</Text>
          <Text style={styles.summaryLine}>Frequency: {medicine.frequency || '-'}</Text>
          <Text style={styles.summaryLine}>Instructions: {medicine.instructions || '-'}</Text>
        </View>
      ))}

      <Text style={allStyles.label}>Recommended Tests</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Test</Text>

        <Text style={allStyles.label}>Test Name</Text>
        <TextInput
          value={props.currentTest.name}
          onChangeText={(value) => props.updateCurrentTest('name', value)}
          style={allStyles.input}
          placeholder="Search or type test"
        />
        <SuggestionChips
          options={GENERAL_PRESCRIPTION_SUGGESTIONS.tests}
          recentValues={recentTestNames}
          query={props.currentTest.name}
          onSelect={(value) => props.updateCurrentTest('name', value)}
        />

        <Text style={allStyles.label}>Tentative Date of Test</Text>
        <TextInput
          value={props.currentTest.toBeDoneOn}
          onChangeText={(value) => props.updateCurrentTest('toBeDoneOn', value)}
          style={allStyles.input}
          placeholder="YYYY-MM-DD"
        />

        <Text style={allStyles.label}>Instructions</Text>
        <SpeechEnabledMultilineInput
          value={props.currentTest.instructions}
          onChangeText={(value) => props.updateCurrentTest('instructions', value)}
          numberOfLines={2}
          {...withAiContext('follow_up', 'Recommended test instructions in general prescription.', 'Use concise follow-up and preparation guidance.')}
        />
        <SuggestionChips
          options={GENERAL_PRESCRIPTION_SUGGESTIONS.testInstructions}
          recentValues={recentTestInstructions}
          query={props.currentTest.instructions}
          onSelect={(value) => props.updateCurrentTest('instructions', value)}
        />

        <View style={styles.sectionActions}>
          <Pressable style={styles.addButton} onPress={props.addTest}>
            <Text style={styles.addButtonText}>Add Test</Text>
          </Pressable>
        </View>
      </View>

      {props.generalRxTests.length > 0 ? <Text style={styles.listHeading}>Test List</Text> : null}
      {props.generalRxTests.map((test) => (
        <View key={`test-${test.serialNo}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Test #{test.serialNo}</Text>
            <Pressable style={styles.removeButton} onPress={() => props.removeTest(test.serialNo)}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          </View>
          <Text style={styles.summaryLine}>Name: {test.name || '-'}</Text>
          <Text style={styles.summaryLine}>Tentative Date: {test.toBeDoneOn || '-'}</Text>
          <Text style={styles.summaryLine}>Instructions: {test.instructions || '-'}</Text>
        </View>
      ))}

      <Text style={allStyles.label}>Additional Notes</Text>
      <SpeechEnabledMultilineInput
        value={props.generalRxAdditionalNotes}
        onChangeText={props.setGeneralRxAdditionalNotes}
        numberOfLines={3}
        {...withAiContext('other', 'General prescription additional notes.', 'Use concise professional clinician notes.')}
      />

      <Text style={allStyles.label}>Follow-up Date</Text>
      <TextInput
        value={props.generalRxFollowupDate}
        onChangeText={props.setGeneralRxFollowupDate}
        style={allStyles.input}
        placeholder="YYYY-MM-DD"
      />
    </>
  );
}

const styles = {
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  sectionActions: {
    marginTop: 12,
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
  },
  addButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: themeColors.primary,
  },
  addButtonText: {
    color: themeColors.textOnBrand,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    padding: 12,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  cardTitle: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  removeButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: themeColors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  removeButtonText: {
    color: themeColors.textPrimary,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  gridRow: {
    flexDirection: 'row' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  gridColumn: {
    flex: 1,
    minWidth: 140,
  },
  suggestionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionText: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  listHeading: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700' as const,
    marginTop: 12,
  },
  summaryLine: {
    color: themeColors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
};