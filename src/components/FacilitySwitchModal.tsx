import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, List, Text } from 'react-native-paper';
import type { Facility } from '../types/auth';
import { themeColors } from '../theme/colors';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface FacilitySwitchModalProps {
  visible: boolean;
  facilities: Facility[];
  selectedFacilityId: string | null;
  onClose: () => void;
  onConfirm: (facilityId: string) => Promise<void>;
}

function formatFacilityAddress(facility: Facility) {
  return [facility.addressLine2, facility.city].filter(Boolean).join(', ');
}

export function FacilitySwitchModal({
  visible,
  facilities,
  selectedFacilityId,
  onClose,
  onConfirm,
}: FacilitySwitchModalProps) {
  const layout = useResponsiveLayout();

  const handleConfirm = async (facilityId: string) => {
    await onConfirm(facilityId);
    onClose();
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom', 'left', 'right']}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.cardWrap, { paddingHorizontal: layout.horizontalPadding }]}>
          <Card style={[styles.card, { maxWidth: layout.modalMaxWidth }]} mode="outlined">
            <Card.Content>
              <Text style={styles.title}>Switch Facility</Text>
              <Text style={styles.subtitle}>
                Save any unsaved work before switching facilities.
              </Text>

              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {facilities.map((facility) => {
                  const isActive = selectedFacilityId === facility.id;
                  return (
                    <List.Item
                      key={facility.id}
                      title={facility.name}
                      description={formatFacilityAddress(facility) || undefined}
                      titleStyle={styles.itemName}
                      descriptionStyle={styles.itemAddress}
                      style={[styles.item, isActive ? styles.itemActive : null]}
                      onPress={() => {
                        if (!isActive) {
                          void handleConfirm(facility.id);
                        }
                      }}
                      right={(props) =>
                        isActive ? <List.Icon {...props} icon="check-circle" color={themeColors.secondary} /> : null
                      }
                    />
                  );
                })}
              </ScrollView>

              <Button mode="contained" style={styles.closeButton} onPress={onClose}>
                Close
              </Button>
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  cardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 14,
    maxHeight: '80%',
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: themeColors.warningText,
    backgroundColor: themeColors.warningSurface,
    borderWidth: 1,
    borderColor: themeColors.warningBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 10,
  },
  list: {
    maxHeight: 300,
  },
  listContent: {
    gap: 8,
  },
  item: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: themeColors.surface,
  },
  itemActive: {
    borderColor: themeColors.secondary,
    backgroundColor: '#FFF7F2',
  },
  itemName: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemAddress: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  closeButton: {
    marginTop: 12,
  },
});
