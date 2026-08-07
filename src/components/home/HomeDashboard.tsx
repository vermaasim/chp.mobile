import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card, IconButton, Text } from 'react-native-paper';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { themeColors } from '../../theme/colors';

export interface HomeDashboardQuickAction {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

export interface HomeDashboardModule {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

export interface HomeDashboardSummaryItem {
  key: string;
  label: string;
  value: string;
  metric?: string;
}

interface HomeDashboardProps {
  displayName: string;
  quickActions: HomeDashboardQuickAction[];
  summaryItems: HomeDashboardSummaryItem[];
  modules: HomeDashboardModule[];
  onOpenPreferences: () => void;
  onOpenProfilePanel: () => void;
  onSummaryItemPress?: (item: HomeDashboardSummaryItem) => void;
}

export function HomeDashboard({
  displayName,
  quickActions,
  summaryItems,
  modules,
  onOpenPreferences,
  onOpenProfilePanel,
  onSummaryItemPress,
}: HomeDashboardProps) {
  const layout = useResponsiveLayout();
  const heroName = displayName.startsWith('Dr.') ? displayName : `Dr. ${displayName}`;
  const quickActionBasis = layout.isLandscape ? '24%' : '31.5%';

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.content, { paddingHorizontal: layout.horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, layout.contentMaxWidth ? { maxWidth: layout.contentMaxWidth } : null]}>
        <Card mode="outlined" style={styles.heroCard}>
          <Card.Content style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>Welcome back</Text>
                <Text numberOfLines={1} style={styles.heroTitle}>
                  {heroName || 'Clinician'}
                </Text>
              </View>

              <View style={styles.heroActionsRow}>
                {/* <Pressable accessibilityRole="button" accessibilityLabel="Open profile panel" onPress={onOpenProfilePanel} style={styles.heroActionButton}>
                  <IconButton icon="account-circle-outline" size={18} iconColor={themeColors.textOnBrand} style={styles.heroActionIcon} />
                  <Text style={styles.heroActionLabel}>Profile</Text>
                </Pressable> */}

                <Pressable accessibilityRole="button" accessibilityLabel="Open bottom bar preferences" onPress={onOpenPreferences} style={styles.heroActionButton}>
                  <IconButton icon="tune-variant" size={18} iconColor={themeColors.textOnBrand} style={styles.heroActionIcon} />
                  <Text style={styles.heroActionLabel}>Preferences</Text>
                </Pressable>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={[styles.quickActionsRow, layout.isTablet ? styles.quickActionsRowTablet : null]}>
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                style={[
                  styles.quickActionCard,
                  action.key === 'add-action' ? styles.quickActionCardMuted : null,
                  layout.isTablet ? { flexBasis: quickActionBasis, flexGrow: 0 } : null,
                ]}
                onPress={action.onPress}
              >
                <View style={styles.quickActionIconWrap}>
                  <IconButton
                    icon={action.icon}
                    size={16}
                    iconColor={
                      action.key === 'new-visit'
                        ? themeColors.primary
                        : action.key === 'new-patient'
                          ? themeColors.secondary
                          : themeColors.textSecondary
                    }
                    style={styles.quickActionIcon}
                  />
                </View>
                <Text numberOfLines={1} style={[styles.quickActionTitle, action.key === 'add-action' ? styles.quickActionTitleMuted : null]}>
                  {action.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Today's summary</Text>
          {layout.isTablet ? (
            <View style={styles.summaryGrid}>
              {summaryItems.map((item) => (
                <Pressable key={item.key} style={[styles.summaryCard, styles.summaryCardTablet]} onPress={() => onSummaryItemPress?.(item)}>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <ScrollView horizontal style={styles.summaryRow} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {summaryItems.map((item) => (
                <Pressable key={item.key} style={styles.summaryCard} onPress={() => onSummaryItemPress?.(item)}>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Core modules</Text>
          <View style={styles.moduleList}>
            {modules.map((module) => (
              <Pressable key={module.key} style={styles.moduleRow} onPress={module.onPress}>
                <View
                  style={[
                    styles.moduleIconWrap,
                    module.key === 'Visits' ? styles.moduleIconWrapSecondary : null,
                    module.key === 'Patients' ? styles.moduleIconWrapPrimarySoft : null,
                  ]}
                >
                  <IconButton icon={module.icon} size={14} iconColor={module.key === 'Visits' ? themeColors.secondary : themeColors.primary} style={styles.moduleIcon} />
                </View>
                <View style={styles.moduleTextWrap}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
                </View>
                <IconButton icon="chevron-right" size={14} iconColor={themeColors.textSecondary} style={styles.moduleChevron} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: themeColors.surface,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  contentInner: {
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 0,
    backgroundColor: themeColors.primary,
  },
  heroContent: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
  },
  heroEyebrow: {
    color: themeColors.textOnBrand,
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.95,
  },
  heroTitle: {
    color: themeColors.textOnBrand,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroActionButton: {
    minWidth: 74,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    gap: 2,
  },
  heroActionIcon: {
    margin: 0,
  },
  heroActionLabel: {
    color: themeColors.textOnBrand,
    fontSize: 10,
    fontWeight: '700',
  },
  heroSupportText: {
    color: themeColors.textOnBrand,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.92,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickActionsRowTablet: {
    flexWrap: 'wrap',
  },
  quickActionCard: {
    flex: 1,
    height: 68,
    borderRadius: 12,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickActionCardMuted: {
    borderColor: '#E1E1DE',
  },
  quickActionIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    margin: 0,
  },
  quickActionTitle: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionTitleMuted: {
    color: themeColors.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryCard: {
    flex: 1,
    height: 60,
    minWidth: 80,
    borderRadius: 10,
    backgroundColor: '#EFF4F4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  summaryCardTablet: {
    minWidth: 130,
    flexGrow: 1,
  },
  summaryValue: {
    color: themeColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  summaryLabel: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  moduleList: {
    borderTopWidth: 0,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E3DA',
  },
  moduleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 173, 175, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 173, 175, 0.10)',
  },
  moduleIconWrapPrimarySoft: {
    backgroundColor: 'rgba(6, 173, 175, 0.10)',
    borderColor: 'rgba(6, 173, 175, 0.10)',
  },
  moduleIconWrapSecondary: {
    backgroundColor: 'rgba(255, 145, 77, 0.14)',
    borderColor: 'rgba(255, 145, 77, 0.14)',
  },
  moduleIcon: {
    margin: 0,
  },
  moduleTextWrap: {
    flex: 1,
    gap: 2,
  },
  moduleTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  moduleSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  moduleChevron: {
    margin: 0,
  },
  
});
