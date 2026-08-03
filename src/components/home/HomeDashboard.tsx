import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Card, IconButton, Text } from 'react-native-paper';
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
  brandTitle: string;
  brandSubtitle: string;
  displayName: string;
  quickActions: HomeDashboardQuickAction[];
  summaryItems: HomeDashboardSummaryItem[];
  modules: HomeDashboardModule[];
  onMenuPress: () => void;
  onFacilityPress: () => void;
  onProfilePress: () => void;
  onSummaryItemPress?: (item: HomeDashboardSummaryItem) => void;
  onHomePress?: () => void;
}

export function HomeDashboard({
  brandTitle,
  brandSubtitle,
  displayName,
  quickActions,
  summaryItems,
  modules,
  onMenuPress,
  onFacilityPress,
  onProfilePress,
  onSummaryItemPress,
  onHomePress,
}: HomeDashboardProps) {
  const heroName = displayName.startsWith('Dr.') ? displayName : `Dr. ${displayName}`;
  const avatarLabel = displayName.trim().charAt(0).toUpperCase() || 'U';
  const visibleModules = modules.slice(0, 3);

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={onMenuPress} style={styles.headerAction}>
            <IconButton icon="menu" size={18} iconColor={themeColors.textSecondary} style={styles.headerActionIcon} />
          </Pressable>

          <View style={styles.brandTextWrap}>
            <Text numberOfLines={1} style={styles.brandTitle}>
              {brandTitle}
            </Text>
            <Text numberOfLines={1} style={styles.brandSubtitle}>
              {brandSubtitle}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Switch facility" onPress={onFacilityPress} style={styles.facilityAction}>
              <IconButton icon="swap-horizontal" size={16} iconColor={themeColors.secondary} style={styles.headerActionIcon} />
            </Pressable>

            <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={onProfilePress}>
              <Avatar.Text size={36} label={avatarLabel} labelStyle={styles.avatarLabel} style={styles.avatar} />
            </Pressable>
          </View>
        </View>

        <Card mode="outlined" style={styles.heroCard}>
          <Card.Content style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>Welcome back</Text>
            <Text numberOfLines={1} style={styles.heroTitle}>
              {heroName || 'Clinician'}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map((action) => (
              <Pressable key={action.key} style={[styles.quickActionCard, action.key === 'add-action' ? styles.quickActionCardMuted : null]} onPress={action.onPress}>
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
          <ScrollView horizontal style={styles.summaryRow} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {summaryItems.map((item) => (
              <Pressable key={item.key} style={styles.summaryCard} onPress={() => onSummaryItemPress?.(item)}>
                <Text style={styles.summaryValue}>{item.value}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Core modules</Text>
          <View style={styles.moduleList}>
            {visibleModules.map((module) => (
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

            <View style={styles.moduleRow}>
              <View style={styles.moduleIconWrapMuted}>
                  <IconButton icon="dots-horizontal" size={14} iconColor={themeColors.textSecondary} style={styles.moduleIcon} />
              </View>
              <View style={styles.moduleTextWrap}>
                <Text style={styles.moduleTitleMuted}>More modules appear here</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        {[
          { key: 'Home', label: 'Home', active: true },
          { key: 'Search', label: 'Search', active: false },
          { key: 'Alerts', label: 'Alerts', active: false },
          { key: 'Profile', label: 'Profile', active: false },
        ].map((item) => (
          <Pressable
            key={item.key}
            style={styles.bottomNavItemWrap}
            onPress={item.key === 'Home' ? onHomePress : undefined}
            disabled={item.key !== 'Home' && !onHomePress}
          >
            <IconButton
              icon={item.key === 'Home' ? 'home-outline' : item.key === 'Search' ? 'magnify' : item.key === 'Alerts' ? 'bell-outline' : 'account-outline'}
              size={16}
              iconColor={item.active ? themeColors.primary : themeColors.textSecondary}
              style={styles.bottomNavIcon}
            />
            <Text style={item.active ? styles.bottomNavLabelActive : styles.bottomNavLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
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
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAction: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionIcon: {
    margin: 0,
  },
  brandTextWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  facilityAction: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: themeColors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  brandTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  brandSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textAlign: 'center',
  },
  avatar: {
    backgroundColor: themeColors.primary,
  },
  avatarLabel: {
    color: themeColors.textOnBrand,
    fontSize: 14,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 0,
    backgroundColor: themeColors.primary,
  },
  heroContent: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 2,
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
  moduleIconWrapMuted: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF2F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFF2F1',
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
  moduleTitleMuted: {
    color: themeColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
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
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#E8E1D8',
    backgroundColor: themeColors.surface,
  },
  bottomNavItemWrap: {
    alignItems: 'center',
    gap: 1,
    minWidth: 56,
  },
  bottomNavIcon: {
    margin: 0,
  },
  bottomNavLabel: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  bottomNavLabelActive: {
    color: themeColors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
});
