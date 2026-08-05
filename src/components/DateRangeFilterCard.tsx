import { useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
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

  const openFilterModal = () => {
    setFilterErrorMessage(null);
    setDraftFilterOption(selectedOption);
    setDraftCustomFromDate(fromDate);
    setDraftCustomToDate(toDate);
    setIsOpen(true);
  };

  const closeFilterModal = () => {
    setIsOpen(false);
    setDatePickerTarget(null);
  };

  const applyPickedDate = (target: 'dialogFrom' | 'dialogTo', selectedDate: Date) => {
    const nextValue = formatDateInput(selectedDate);

    if (target === 'dialogFrom') {
      setDraftCustomFromDate(nextValue);
      setDraftFilterOption('custom');
      return;
    }

    setDraftCustomToDate(nextValue);
    setDraftFilterOption('custom');
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
    closeFilterModal();

    await onApply({
      option: nextOption,
      fromDate: nextRange.fromDate,
      toDate: nextRange.toDate,
    });
  };

  const formatReadableDate = (value: string) => {
    const parsed = parseDateInput(value);
    return parsed.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatReadableDateWithYear = (value: string) => {
    const parsed = parseDateInput(value);
    return parsed.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <View style={styles.filterCard}>
        <Pressable accessibilityRole="button" onPress={openFilterModal} style={styles.summaryButton}>
          <View style={styles.summaryLeftIconWrap}>
            <Feather name="calendar" size={14} color={themeColors.primary} />
          </View>
          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryTitle}>{getFilterLabel(selectedOption)}</Text>
            <Text style={styles.summaryDates}>{`${formatReadableDate(fromDate)} - ${formatReadableDateWithYear(toDate)}`}</Text>
          </View>
          <Feather name="chevron-down" size={18} color={themeColors.textSecondary} />
        </Pressable>
      </View>

      <Modal animationType="fade" transparent visible={isOpen} onRequestClose={closeFilterModal}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={closeFilterModal} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select date range</Text>

            <View style={styles.optionGrid}>
              {DATE_FILTER_OPTIONS.map((option) => {
                const isSelected = draftFilterOption === option.key;

                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    onPress={() => {
                      setDraftFilterOption(option.key);
                      if (option.key !== 'custom') {
                        const nextRange = getRangeForOption(option.key);
                        setDraftCustomFromDate(nextRange.fromDate);
                        setDraftCustomToDate(nextRange.toDate);
                      }
                    }}
                    style={[styles.optionChip, isSelected ? styles.optionChipActive : null]}
                  >
                    <Text style={[styles.optionChipText, isSelected ? styles.optionChipTextActive : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.rangePreviewWrap}>
              <Text style={styles.rangePreviewText}>{`${formatReadableDateWithYear(draftCustomFromDate)} - ${formatReadableDateWithYear(draftCustomToDate)}`}</Text>
            </View>

            <View style={styles.datePickersRow}>
              <Pressable style={styles.datePickerButton} onPress={() => openDatePicker('dialogFrom')}>
                <View>
                  <Text style={styles.datePickerDay}>{parseDateInput(draftCustomFromDate).getDate()}</Text>
                  <Text style={styles.datePickerMonth}>{parseDateInput(draftCustomFromDate).toLocaleDateString(undefined, { month: 'short' })}</Text>
                </View>
                <Feather name="calendar" size={14} color={themeColors.primary} />
              </Pressable>

              <Pressable style={styles.datePickerButton} onPress={() => openDatePicker('dialogTo')}>
                <View>
                  <Text style={styles.datePickerDay}>{parseDateInput(draftCustomToDate).getDate()}</Text>
                  <Text style={styles.datePickerMonth}>{parseDateInput(draftCustomToDate).toLocaleDateString(undefined, { month: 'short' })}</Text>
                </View>
                <Feather name="calendar" size={14} color={themeColors.primary} />
              </Pressable>
            </View>

            {filterErrorMessage ? <Text style={styles.filterErrorText}>{filterErrorMessage}</Text> : null}

            <View style={styles.sheetActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel date filter changes"
                onPress={closeFilterModal}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apply date filter"
                onPress={() => void applyDateFilter()}
                disabled={draftFilterOption === 'custom' && !isCustomRangeValid}
                style={[
                  styles.applyButton,
                  draftFilterOption === 'custom' && !isCustomRangeValid ? styles.applyButtonDisabled : null,
                ]}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {showAndroidDatePicker ? (
        <DateTimePicker value={pickerValue} mode="date" display="default" onChange={onDatePickerChange} />
      ) : null}

      {Platform.OS === 'ios' && iosPickerVisible && datePickerTarget ? (
        <Modal animationType="fade" transparent visible onRequestClose={closeIosPicker}>
          <View style={styles.pickerModalOverlay}>
            <Pressable style={styles.pickerModalBackdrop} onPress={closeIosPicker} />
            <View style={styles.pickerModalCard}>
              <Text style={styles.pickerModalTitle}>Select Date</Text>
              <DateTimePicker value={iosPickerDate} mode="date" display="spinner" onChange={onDatePickerChange} />
              <View style={styles.pickerModalActions}>
                <Pressable style={styles.cancelButton} onPress={closeIosPicker}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.applyButton} onPress={confirmIosPicker}>
                  <Text style={styles.applyButtonText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  filterCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    overflow: 'hidden',
  },
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F2F6F6',
  },
  summaryLeftIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#BFE7E7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF8F8',
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryDates: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D2D0CC',
  },
  sheetTitle: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    width: '31.6%',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DDD8D0',
    backgroundColor: themeColors.surface,
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  optionChipText: {
    color: '#5B5E62',
    fontSize: 14,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: themeColors.textOnBrand,
    fontWeight: '800',
  },
  rangePreviewWrap: {
    borderTopWidth: 1,
    borderTopColor: '#ECE7DF',
    paddingTop: 12,
  },
  rangePreviewText: {
    color: '#7B7771',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickerButton: {
    flex: 1,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DDD8D0',
    backgroundColor: themeColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerDay: {
    color: themeColors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
  },
  datePickerMonth: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
    textTransform: 'capitalize',
  },
  sheetActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD8D0',
    backgroundColor: themeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButtonText: {
    color: '#5B5E62',
    fontSize: 14,
    fontWeight: '700',
  },
  applyButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: themeColors.textOnBrand,
    fontSize: 14,
    fontWeight: '800',
  },
  filterErrorText: {
    color: themeColors.warningText,
    backgroundColor: themeColors.warningSurface,
    borderWidth: 1,
    borderColor: themeColors.warningBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 17,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pickerModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pickerModalCard: {
    borderRadius: 14,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  pickerModalTitle: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  pickerModalActions: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
