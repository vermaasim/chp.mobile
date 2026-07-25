import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, Divider, IconButton, Text } from 'react-native-paper';
import { AppBar } from '../components/AppBar';
import { AttendancePanel } from '../components/AttendancePanel';
import { FacilitySwitchModal } from '../components/FacilitySwitchModal';
import { InfoPlaceholder } from '../components/InfoPlaceholder';
import { MyTasksPanel } from '../components/MyTasksPanel';
import { ProfileMenu } from '../components/ProfileMenu';
import { SideMenu, type SideMenuItem } from '../components/SideMenu';
import { TaskDetailsPanel } from '../components/TaskDetailsPanel';
import { TodaySummaryCards, type TodaySummaryCardItem } from '../components/home/TodaySummaryCards';
import { themeColors } from '../theme/colors';
import type { AuthSession } from '../types/auth';

interface HomeScreenProps {
  user: AuthSession;
  onSelectFacility: (facilityId: string) => Promise<void>;
  onSignOut: () => void;
}

function buildDisplayName(user: AuthSession) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ');
}

type ModulePageKey = 'My Tasks' | 'My Attendance' | 'Patients' | 'Enquiries' | 'Visits' | 'Billing';
type PageKey = 'Home' | ModulePageKey | 'Task Details';

type ModuleConfig = {
  key: ModulePageKey;
  title: string;
  subtitle: string;
  icon: string;
};

type NormalizedRole = 'facilityadmin' | 'physician' | 'frontdesk';

const MODULE_CONFIGS: Record<ModulePageKey, ModuleConfig> = {
  'My Tasks': {
    key: 'My Tasks',
    title: 'Tasks',
    subtitle: 'Review your assigned services and update records',
    icon: 'clipboard-text-outline',
  },
  Visits: {
    key: 'Visits',
    title: 'Visits',
    subtitle: 'Plan and monitor scheduled visits',
    icon: 'map-marker-path',
  },
  Patients: {
    key: 'Patients',
    title: 'Patients',
    subtitle: 'Manage patient profiles and records',
    icon: 'account-group-outline',
  },
  Enquiries: {
    key: 'Enquiries',
    title: 'Enquiries',
    subtitle: 'Track incoming leads and requests',
    icon: 'help-circle-outline',
  },
  Billing: {
    key: 'Billing',
    title: 'Billing',
    subtitle: 'Review billing and collections overview',
    icon: 'currency-inr',
  },
  'My Attendance': {
    key: 'My Attendance',
    title: 'Attendance',
    subtitle: 'Track daily check-in and check-out activity',
    icon: 'calendar-month-outline',
  },
};

const ROLE_MODULES: Record<NormalizedRole, ModulePageKey[]> = {
  facilityadmin: ['My Tasks', 'Visits', 'Patients', 'Enquiries', 'Billing', 'My Attendance'],
  physician: ['My Tasks', 'My Attendance', 'Patients'],
  frontdesk: ['My Attendance', 'Enquiries', 'Patients', 'Visits'],
};

const ORG_ADMIN_SUMMARY_ITEMS: TodaySummaryCardItem[] = [
  { key: 'total-visits', label: 'Total Visits', value: '--' },
  { key: 'new-patients', label: 'New Patients', value: '--' },
  { key: 'billed-collected', label: 'Billed vs Collected', value: '-- / --' },
];

const PHYSICIAN_SUMMARY_ITEMS: TodaySummaryCardItem[] = [
  { key: 'my-tasks', label: 'My Tasks', value: '--' },
  { key: 'pending-tasks', label: 'Pending Tasks', value: '--' },
];

function normalizeRoleName(value: string): NormalizedRole | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'facilityadmin' || normalized === 'physician' || normalized === 'frontdesk') {
    return normalized;
  }
  return null;
}

function getVisibleRoles(user: AuthSession): NormalizedRole[] {
  const fromRoles = user.roles
    .map(normalizeRoleName)
    .filter((role): role is NormalizedRole => Boolean(role));

  if (fromRoles.length > 0) {
    return Array.from(new Set(fromRoles));
  }

  const fallbackRole = normalizeRoleName(user.designation);
  return fallbackRole ? [fallbackRole] : [];
}

function getVisibleModules(user: AuthSession): ModulePageKey[] {
  const roles = getVisibleRoles(user);
  const orderedModules = Object.keys(MODULE_CONFIGS) as ModulePageKey[];
  const allowedSet = new Set<ModulePageKey>();

  roles.forEach((role) => {
    ROLE_MODULES[role].forEach((moduleKey) => {
      allowedSet.add(moduleKey);
    });
  });

  if (allowedSet.size === 0) {
    return ['My Tasks', 'My Attendance'];
  }

  return orderedModules.filter((moduleKey) => allowedSet.has(moduleKey));
}

function getBreadcrumbLabel(page: PageKey) {
  return page;
}

function getAllowedPrescriptionTypes(user: AuthSession) {
  return user.selectedFacility?.licenseDetails?.allowedPrescriptions;
}

export function HomeScreen({ user, onSignOut, onSelectFacility }: HomeScreenProps) {
  const displayName = buildDisplayName(user);
  const insets = useSafeAreaInsets();
  const [pageStack, setPageStack] = useState<PageKey[]>(['Home']);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [isFacilityModalVisible, setIsFacilityModalVisible] = useState(false);

  const activePage = pageStack[pageStack.length - 1];
  const activeFacilityName = user.selectedFacility?.name ?? user.companyName;
  const prescriptionTypesCount = getAllowedPrescriptionTypes(user)?.length ?? 0;
  const visibleModules = useMemo(() => getVisibleModules(user), [user]);
  const visibleModuleSet = useMemo(() => new Set(visibleModules), [visibleModules]);
  const isFacilityAdmin = useMemo(() => getVisibleRoles(user).includes('facilityadmin'), [user]);
  const summaryItems = useMemo(() => {
    if (isFacilityAdmin) {
      return ORG_ADMIN_SUMMARY_ITEMS;
    }
    return PHYSICIAN_SUMMARY_ITEMS;
  }, [isFacilityAdmin]);

  const menuItems = useMemo<SideMenuItem[]>(() => {
    const coreItems: SideMenuItem[] = [
      { key: 'Home', label: 'Home', icon: 'view-dashboard-outline' },
      ...visibleModules.map((moduleKey) => ({
        key: moduleKey,
        label: MODULE_CONFIGS[moduleKey].title,
        icon: MODULE_CONFIGS[moduleKey].icon,
      })),
    ];
    return coreItems;
  }, [visibleModules]);

  const homeCards = useMemo(
    () =>
      visibleModules.map((moduleKey) => {
        const config = MODULE_CONFIGS[moduleKey];
        return {
          key: config.key,
          title: config.title,
          subtitle: config.subtitle,
          icon: config.icon,
          onPress: () => navigateRootPage(config.key),
        };
      }),
    [visibleModules],
  );

  const breadcrumbText = useMemo(() => pageStack.map(getBreadcrumbLabel).join(' / '), [pageStack]);
  const isBackDisabled = pageStack.length <= 1;

  const navigateRootPage = (page: Exclude<PageKey, 'Task Details'> | ModulePageKey) => {
    if (page === 'Home') {
      setPageStack(['Home']);
      setSelectedTaskId(null);
      return;
    }

    setPageStack(['Home', page as PageKey]);
  };

  const goBack = () => {
    if (isBackDisabled) {
      return;
    }

    setPageStack((previousStack) => previousStack.slice(0, -1));
  };

  const handleSelectMenuItem = (key: string) => {
    if (key !== 'Home' && !(key in MODULE_CONFIGS)) {
      return;
    }

    if (key !== 'Home' && !visibleModuleSet.has(key as ModulePageKey)) {
      return;
    }

    navigateRootPage(key as Exclude<PageKey, 'Task Details'> | ModulePageKey);
    setIsMenuVisible(false);
  };

  const openTaskDetails = (taskId: string) => {
    setSelectedTaskId(taskId);
    setPageStack(['Home', 'My Tasks', 'Task Details']);
  };

  const renderPageContent = () => {
    if (activePage === 'My Tasks') {
      if (!user.selectedFacility?.id) {
        return <InfoPlaceholder title="My Tasks" />;
      }

      return <MyTasksPanel token={user.token} facilityId={user.selectedFacility.id} onOpenTaskDetails={openTaskDetails} />;
    }

    if (activePage === 'Task Details') {
      const selectedFacilityId = user.selectedFacility?.id;

      if (!selectedTaskId) {
        return <InfoPlaceholder title="Task Details" />;
      }

      if (!selectedFacilityId) {
        return <InfoPlaceholder title="Task Details" />;
      }

      return (
        <TaskDetailsPanel
          token={user.token}
          taskId={selectedTaskId}
          facilityId={selectedFacilityId}
          allowedPrescriptionTypes={getAllowedPrescriptionTypes(user)}
        />
      );
    }

    if (activePage === 'My Attendance') {
      return <AttendancePanel />;
    }

    if (activePage === 'Patients' || activePage === 'Enquiries' || activePage === 'Visits' || activePage === 'Billing') {
      return <InfoPlaceholder title={activePage} />;
    }

    if (activePage === 'Home') {
      return (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={[styles.homeScrollContent, { paddingBottom: insets.bottom + 22 }]}
          showsVerticalScrollIndicator={false}
        >
          <Card mode="outlined" style={styles.summaryCard}>
            <Card.Content style={styles.summaryCardContent}>
              <View style={styles.summaryTopRow}>
                <Avatar.Icon
                  size={52}
                  icon="account"
                  color={themeColors.textOnBrand}
                  style={styles.summaryAvatar}
                />

                <View style={styles.summaryTextWrap}>
                  <Text style={styles.summaryEyebrow}>Welcome</Text>
                  <Text numberOfLines={1} style={styles.summaryHeading}>
                    {'Dr. ' + (displayName ||  user.userName || 'Clinician')}
                  </Text>
                  <Text numberOfLines={2} style={styles.summarySubtitle}>
                    {user.designation}
                  </Text>
                </View>
              </View>

              <TodaySummaryCards items={summaryItems} />
            </Card.Content>
          </Card>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Core Modules</Text>
            <Text style={styles.sectionCaption}>Choose a module to continue</Text>
          </View>

          <View style={styles.quickActionsColumn}>
            {homeCards.map((item) => (
              <Card
                key={item.key}
                mode="outlined"
                onPress={item.onPress}
                style={styles.quickActionCard}
              >
                <Card.Content style={styles.quickActionCardContent}>
                  <View style={styles.quickActionIconWrap}>
                    <IconButton icon={item.icon} size={22} iconColor={themeColors.primary} style={styles.quickActionIcon} />
                  </View>
                  <View style={styles.quickActionTextWrap}>
                    <Text style={styles.quickActionTitle}>{item.title}</Text>
                    <Text style={styles.quickActionSubtitle}>{item.subtitle}</Text>
                  </View>
                  <IconButton icon="chevron-right" size={20} iconColor={themeColors.textSecondary} />
                </Card.Content>
              </Card>
            ))}
          </View>
        </ScrollView>
      );
    }

    return <InfoPlaceholder title={activePage} />;
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <View style={styles.contentWrap}>
        <AppBar
          title="Click Health Pro"
          logoSource={require('../../assets/chp-logo.png')}
          facilityName={activeFacilityName}
          userLabel={displayName || user.userName || 'U'}
          onMenuPress={() => setIsMenuVisible(true)}
          onFacilityPress={() => setIsFacilityModalVisible(true)}
          onProfilePress={() => setIsProfileMenuVisible(true)}
        />
        <Divider style={styles.topDivider} />

        <View style={styles.fixedHeaderWrap}>
          <View style={styles.breadcrumbWrap}>
            <IconButton
              icon="arrow-left"
              size={18}
              mode="contained-tonal"
              disabled={isBackDisabled}
              onPress={goBack}
              style={styles.backButton}
            />
            <Text numberOfLines={1} style={styles.breadcrumbCurrent}>{breadcrumbText}</Text>
          </View>
        </View>

        <View style={[styles.contentScroll, { paddingBottom: insets.bottom + 16 }]}>
          {renderPageContent()}
        </View>
      </View>

      <SideMenu
        visible={isMenuVisible}
        items={menuItems}
        activeItemKey={activePage}
        onSelectItem={handleSelectMenuItem}
        onClose={() => setIsMenuVisible(false)}
      />

      <ProfileMenu
        visible={isProfileMenuVisible}
        displayName={displayName}
        email={user.email}
        onClose={() => setIsProfileMenuVisible(false)}
        onSignOut={() => {
          setIsProfileMenuVisible(false);
          void onSignOut();
        }}
      />

      <FacilitySwitchModal
        visible={isFacilityModalVisible}
        facilities={user.associatedFacilities}
        selectedFacilityId={user.selectedFacility?.id ?? null}
        onClose={() => setIsFacilityModalVisible(false)}
        onConfirm={onSelectFacility}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themeColors.appBackground,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  topDivider: {
    backgroundColor: themeColors.border,
    height: 1,
  },
  fixedHeaderWrap: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  breadcrumbWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    justifyContent: 'flex-start',
    gap: 8,
    borderRadius: 10,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingVertical: 6,
  },
  backButton: {
    margin: 0,
    backgroundColor: themeColors.surfaceMuted,
  },
  breadcrumbCurrent: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  contentScroll: {
    flex: 1,
  },
  homeScrollContent: {
    paddingTop: 4,
    gap: 12,
  },
  summaryCard: {
    borderRadius: 14,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  summaryCardContent: {
    gap: 8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryAvatar: {
    backgroundColor: themeColors.primary,
  },
  summaryTextWrap: {
    flex: 1,
    gap: 2,
  },
  summaryEyebrow: {
    color: themeColors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: '700',
  },
  summaryHeading: {
    color: themeColors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  summarySubtitle: {
    color: themeColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryFocusDetail: {
    color: themeColors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionHeaderRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCaption: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionsColumn: {
    gap: 10,
  },
  quickActionCard: {
    borderRadius: 14,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  quickActionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 84,
    gap: 8,
  },
  quickActionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: themeColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  quickActionIcon: {
    margin: 0,
  },
  quickActionTextWrap: {
    flex: 1,
    gap: 2,
  },
  quickActionTitle: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  quickActionSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});