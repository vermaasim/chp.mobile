import { useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { allStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import {
  DATE_FILTER_OPTIONS,
  getFilterLabel,
  getRangeForOption,
  isValidDateRange,
  parseDateInput,
  formatDateInput,
  type DateFilterOption,
} from '../utils/dateRangeFilter';

interface DateRangeFilterCardProps {
  summaryLabel: string;
  selectedOption: DateFilterOption;
  fromDate: string;
  toDate: string;
  onApply: (selection: { option: DateFilterOption; fromDate: string; toDate: string }) => Promise<void> | void;
}

export function DateRangeFilterCard({
  summaryLabel,
  selectedOption,
  fromDate,
  toDate,
  onApply,
}: DateRangeFilterCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterErrorMessage, setFilterErrorMessage] = useState<string | null>(null);
  const [draftFilterOption, setDraftFilterOption] = useState<DateFilterOption>(selectedOption);
  const [draftCustomFromDate, setDraftCustomFromDate] = useState(fromDate);
  const [draftCustomToDate, setDraftCustomToDate] = useState(toDate);
  const [datePickerTarget, setDatePickerTarget] = useState<'dialogFrom' | 'dialogTo' | null>(null);
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [iosPickerDate, setIosPickerDate] = useState(new Date());

  const showAndroidDatePicker = Platform.OS === 'android' && datePickerTarget !== null;

  const pickerValue = useMemo(() => {
    if (datePickerTarget === 'dialogFrom') {
      return parseDateInput(draftCustomFromDate);
    }

    if (datePickerTarget === 'dialogTo') {
      return parseDateInput(draftCustomToDate);
    }

    return new Date();
  }, [datePickerTarget, draftCustomFromDate, draftCustomToDate]);

  const isCustomRangeValid = isValidDateRange(draftCustomFromDate, draftCustomToDate);

  const toggleFilterAccordion = () => {
    setIsOpen((previousValue) => {
      const nextValue = !previousValue;

      if (nextValue) {
        setFilterErrorMessage(null);
        setDraftFilterOption(selectedOption);
        setDraftCustomFromDate(fromDate);
        setDraftCustomToDate(toDate);
      }

      return nextValue;
    });
  };

  const applyPickedDate = (target: 'dialogFrom' | 'dialogTo', selectedDate: Date) => {
    const nextValue = formatDateInput(selectedDate);

    if (target === 'dialogFrom') {
      setDraftCustomFromDate(nextValue);
      return;
    }

    setDraftCustomToDate(nextValue);
  };

  const openDatePicker = (target: 'dialogFrom' | 'dialogTo') => {
    setDatePickerTarget(target);

    if (Platform.OS === 'ios') {
      setIosPickerDate(target === 'dialogFrom' ? parseDateInput(draftCustomFromDate) : parseDateInput(draftCustomToDate));
      setIosPickerVisible(true);
    }
  };

  const closeIosPicker = () => {
    setIosPickerVisible(false);
    setDatePickerTarget(null);
  };

  const confirmIosPicker = () => {
    if (datePickerTarget) {
      applyPickedDate(datePickerTarget, iosPickerDate);
    }

    closeIosPicker();
  };

  const onDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      if (selectedDate) {
        setIosPickerDate(selectedDate);
      }
      return;
    }

    if (event.type === 'dismissed') {
      setDatePickerTarget(null);
      return;
    }

    if (!selectedDate || !datePickerTarget) {
      setDatePickerTarget(null);
      return;
    }

    applyPickedDate(datePickerTarget, selectedDate);
    setDatePickerTarget(null);
  };

  const applyDateFilter = async () => {
    const nextOption = draftFilterOption;
    const nextRange =
      nextOption === 'custom'
        ? {
            fromDate: draftCustomFromDate,
            toDate: draftCustomToDate,
          }
        : getRangeForOption(nextOption);

    if (nextOption === 'custom' && !isValidDateRange(nextRange.fromDate, nextRange.toDate)) {
      setFilterErrorMessage('The start date must be on or before the end date.');
      return;
    }

    setFilterErrorMessage(null);
    setIsOpen(false);

    await onApply({
      option: nextOption,
      fromDate: nextRange.fromDate,
      toDate: nextRange.toDate,
    });
  };

  return (
    <View style={allStyles.filterCard}>
      <View style={allStyles.selectedFilterSummary}>
        <Pressable accessibilityRole="button" onPress={toggleFilterAccordion} style={allStyles.accordionHeader}>
          <View style={allStyles.accordionHeaderTextWrap}>
            <View style={allStyles.filterSummaryRow}>
              <Feather name="calendar" size={13} color={themeColors.textSecondary} />
              <Text style={allStyles.selectedFilterLabel}>{summaryLabel}</Text>
            </View>
            <View style={allStyles.filterSummaryValueRow}>
              <Text style={allStyles.selectedFilterValue}>{getFilterLabel(selectedOption)}</Text>
              <Text style={allStyles.selectedFilterDates}>{fromDate} to {toDate}</Text>
            </View>
          </View>
          <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={themeColors.textSecondary} />
        </Pressable>

        {isOpen ? (
          <View style={allStyles.accordionContent}>
            <View style={allStyles.filterChipGroup}>
              {DATE_FILTER_OPTIONS.map((option) => {
                const isSelected = draftFilterOption === option.key;

                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    onPress={() => setDraftFilterOption(option.key)}
                    style={[allStyles.filterChip, isSelected ? allStyles.filterChipSelected : null]}
                  >
                    <Text style={[allStyles.filterChipText, isSelected ? allStyles.filterChipTextSelected : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {draftFilterOption === 'custom' ? (
              <View style={allStyles.customRangeWrap}>
                <View style={allStyles.customRangeRow}>
                  <View style={allStyles.customRangeField}>
                    <Text style={allStyles.label}>From</Text>
                    <Pressable style={allStyles.datePickerButton} onPress={() => openDatePicker('dialogFrom')}>
                      <Text style={allStyles.datePickerText}>{draftCustomFromDate}</Text>
                      <Feather name="calendar" size={14} color={themeColors.primary} />
                    </Pressable>
                  </View>

                  <View style={allStyles.customRangeField}>
                    <Text style={allStyles.label}>To</Text>
                    <Pressable style={allStyles.datePickerButton} onPress={() => openDatePicker('dialogTo')}>
                      <Text style={allStyles.datePickerText}>{draftCustomToDate}</Text>
                      <Feather name="calendar" size={14} color={themeColors.primary} />
                    </Pressable>
                  </View>
                </View>

                {filterErrorMessage ? <Text style={allStyles.filterErrorText}>{filterErrorMessage}</Text> : null}
              </View>
            ) : null}

            <View style={allStyles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel date filter changes"
                onPress={toggleFilterAccordion}
                style={allStyles.dialogCancelButton}
              >
                <Text style={allStyles.dialogCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apply date filter"
                onPress={() => void applyDateFilter()}
                disabled={draftFilterOption === 'custom' && !isCustomRangeValid}
                style={[
                  allStyles.dialogApplyButton,
                  draftFilterOption === 'custom' && !isCustomRangeValid ? allStyles.dialogApplyButtonDisabled : null,
                ]}
              >
                <Text style={allStyles.dialogApplyText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {showAndroidDatePicker ? (
        <DateTimePicker value={pickerValue} mode="date" display="default" onChange={onDatePickerChange} />
      ) : null}

      {Platform.OS === 'ios' && iosPickerVisible && datePickerTarget ? (
        <Modal animationType="fade" transparent visible onRequestClose={closeIosPicker}>
          <View style={allStyles.pickerModalOverlay}>
            <Pressable style={allStyles.pickerModalBackdrop} onPress={closeIosPicker} />
            <View style={allStyles.pickerModalCard}>
              <Text style={allStyles.pickerModalTitle}>Select Date</Text>
              <DateTimePicker value={iosPickerDate} mode="date" display="spinner" onChange={onDatePickerChange} />
              <View style={allStyles.pickerModalActions}>
                <Pressable style={allStyles.dialogCancelButton} onPress={closeIosPicker}>
                  <Text style={allStyles.dialogCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={allStyles.dialogApplyButton} onPress={confirmIosPicker}>
                  <Text style={allStyles.dialogApplyText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
