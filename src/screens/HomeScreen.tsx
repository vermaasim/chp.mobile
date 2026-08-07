import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, IconButton, Text } from 'react-native-paper';
import { loadTodaySummaryItems, type SummaryMetricKey, type SummaryRole } from '../api/summary';
import { AttendancePanel } from '../components/AttendancePanel';
import { BottomBarPreferencesModal, type BottomBarPreferenceOption } from '../components/BottomBarPreferencesModal';
import { BrandLogo } from '../components/BrandLogo';
import { FacilitySwitchModal } from '../components/FacilitySwitchModal';
import { InfoPlaceholder } from '../components/InfoPlaceholder';
import { MyTasksPanel } from '../components/MyTasksPanel';
import { NewPatientPanel } from '../components/NewPatientPanel';
import { NewVisitPanel } from '../components/NewVisitPanel';
import { PatientDetailsPanel } from '../components/PatientDetailsPanel';
import { PatientsPanel } from '../components/PatientsPanel';
import { ProfileMenu } from '../components/ProfileMenu';
import { TaskDetailsPanel } from '../components/TaskDetailsPanel';
import { VisitDetailsPanel } from '../components/VisitDetailsPanel';
import { VisitsPanel } from '../components/VisitsPanel';
import { HomeDashboard, type HomeDashboardModule, type HomeDashboardQuickAction, type HomeDashboardSummaryItem } from '../components/home/HomeDashboard';
import { SummaryDetailModal } from '../components/home/SummaryDetailModal';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { loadBottomBarModulePreference, saveBottomBarModulePreference } from '../storage/bottomBarPreferences';
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

type ModulePageKey = 'My Tasks' | 'Patients' | 'Enquiries' | 'Visits' | 'Billing';
type PageKey = 'Home' | ModulePageKey | 'My Attendance' | 'Task Details' | 'Visit Details' | 'New Visit' | 'Patient Details' | 'New Patient';

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
};

const ROLE_MODULES: Record<NormalizedRole, ModulePageKey[]> = {
  facilityadmin: ['My Tasks', 'Visits', 'Patients', 'Enquiries', 'Billing'],
  physician: ['My Tasks', 'Visits', 'Patients'],
  frontdesk: ['Visits', 'Patients', 'Enquiries'],
};

const BOTTOM_BAR_MAX_MODULES = 3;

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
    return ['My Tasks', 'Visits', 'Patients'];
  }

  return orderedModules.filter((moduleKey) => allowedSet.has(moduleKey));
}

function getBottomBarPreferenceScope(user: AuthSession) {
  const roles = getVisibleRoles(user).sort().join('-') || 'default';
  return `${user.userId}.${roles}`;
}

function sanitizeBottomBarModules(selectedKeys: string[], allowedModules: ModulePageKey[]) {
  const selectedSet = new Set(selectedKeys.filter((key): key is ModulePageKey => allowedModules.includes(key as ModulePageKey)));
  return allowedModules.filter((moduleKey) => selectedSet.has(moduleKey)).slice(0, BOTTOM_BAR_MAX_MODULES);
}

function getDefaultBottomBarModules(allowedModules: ModulePageKey[]) {
  return allowedModules.slice(0, BOTTOM_BAR_MAX_MODULES);
}

function getActiveBottomBarKey(activePage: PageKey): 'Home' | ModulePageKey {
  if (activePage === 'Task Details') {
    return 'My Tasks';
  }

  if (activePage === 'Visit Details' || activePage === 'New Visit') {
    return 'Visits';
  }

  if (activePage === 'Patient Details' || activePage === 'New Patient') {
    return 'Patients';
  }

  if (activePage === 'My Attendance') {
    return 'Home';
  }

  return activePage === 'Home' ? 'Home' : activePage;
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
  const layout = useResponsiveLayout();
  const [pageStack, setPageStack] = useState<PageKey[]>(['Home']);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [isPreferencesVisible, setIsPreferencesVisible] = useState(false);
  const [isFacilityModalVisible, setIsFacilityModalVisible] = useState(false);
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);
  const [selectedSummaryMetric, setSelectedSummaryMetric] = useState<SummaryMetricKey | null>(null);
  const [selectedSummaryTitle, setSelectedSummaryTitle] = useState('');
  const [summaryItems, setSummaryItems] = useState<HomeDashboardSummaryItem[]>([
    { key: 'tasks', label: 'Tasks', value: '0', metric: 'allTasks' },
    { key: 'new-patients', label: 'New patients', value: '0', metric: 'newPatients' },
    { key: 'enquiries', label: 'Enquiries', value: '0', metric: 'enquiries' },
  ]);

  const activePage = pageStack[pageStack.length - 1];
  const activeFacilityName = user.selectedFacility?.name ?? user.companyName;
  const visibleModules = useMemo(() => getVisibleModules(user), [user]);
  const defaultBottomBarModules = useMemo(() => getDefaultBottomBarModules(visibleModules), [visibleModules]);
  const preferenceScope = useMemo(() => getBottomBarPreferenceScope(user), [user]);
  const [bottomBarModules, setBottomBarModules] = useState<ModulePageKey[]>(defaultBottomBarModules);

  const primaryRole = useMemo<SummaryRole | null>(() => {
    const roles = getVisibleRoles(user);
    if (roles.includes('facilityadmin')) {
      return 'facilityadmin';
    }

    if (roles.includes('physician')) {
      return 'physician';
    }

    if (roles.includes('frontdesk')) {
      return 'frontdesk';
    }

    return null;
  }, [user]);

  useEffect(() => {
    const token = user.token;
    const facilityId = user.selectedFacility?.id;

    if (!token || !facilityId || !primaryRole) {
      setSummaryItems([
        { key: 'tasks', label: 'Tasks', value: '0', metric: 'allTasks' },
        { key: 'new-patients', label: 'New patients', value: '0', metric: 'newPatients' },
        { key: 'enquiries', label: 'Enquiries', value: '0', metric: 'enquiries' },
      ]);
      return;
    }

    let isMounted = true;

    loadTodaySummaryItems(token, facilityId, primaryRole)
      .then((items) => {
        if (isMounted) {
          setSummaryItems(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSummaryItems([
            { key: 'tasks', label: 'Tasks', value: '0', metric: 'allTasks' },
            { key: 'new-patients', label: 'New patients', value: '0', metric: 'newPatients' },
            { key: 'enquiries', label: 'Enquiries', value: '0', metric: 'enquiries' },
          ]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [primaryRole, user.selectedFacility?.id, user.token]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const storedPreference = await loadBottomBarModulePreference(preferenceScope);

      if (!mounted) {
        return;
      }

      if (!storedPreference) {
        setBottomBarModules(defaultBottomBarModules);
        return;
      }

      setBottomBarModules(sanitizeBottomBarModules(storedPreference.selectedModuleKeys, visibleModules));
    })();

    return () => {
      mounted = false;
    };
  }, [defaultBottomBarModules, preferenceScope, visibleModules]);

  const homeCards = useMemo<HomeDashboardModule[]>(
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

  const preferenceOptions = useMemo<BottomBarPreferenceOption[]>(
    () =>
      visibleModules.map((moduleKey) => ({
        key: moduleKey,
        title: MODULE_CONFIGS[moduleKey].title,
        subtitle: MODULE_CONFIGS[moduleKey].subtitle,
        icon: MODULE_CONFIGS[moduleKey].icon,
      })),
    [visibleModules],
  );

  const bottomNavItems = useMemo(
    () => [
      { key: 'Home' as const, label: 'Home', icon: 'home-outline' },
      ...bottomBarModules.map((moduleKey) => ({
        key: moduleKey,
        label: MODULE_CONFIGS[moduleKey].title,
        icon: MODULE_CONFIGS[moduleKey].icon,
      })),
    ],
    [bottomBarModules],
  );

  const activeBottomBarKey = useMemo(() => getActiveBottomBarKey(activePage), [activePage]);

  const isFullScreenFlow = activePage === 'New Visit' || activePage === 'New Patient';

  const navigateRootPage = (page: Exclude<PageKey, 'Task Details'> | ModulePageKey) => {
    if (page === 'Home') {
      setPageStack(['Home']);
      setSelectedTaskId(null);
      setSelectedVisitId(null);
      setSelectedPatientId(null);
      return;
    }

    setPageStack(['Home', page as PageKey]);
  };

  const handleSummaryItemPress = (item: HomeDashboardSummaryItem) => {
    if (!item.metric) {
      return;
    }

    setSelectedSummaryMetric(item.metric as SummaryMetricKey);
    setSelectedSummaryTitle(item.label);
    setIsSummaryModalVisible(true);
  };

  const handleSaveBottomBarPreferences = async (selectedKeys: string[]) => {
    const sanitizedSelection = sanitizeBottomBarModules(selectedKeys, visibleModules);
    setBottomBarModules(sanitizedSelection);
    setIsPreferencesVisible(false);
    await saveBottomBarModulePreference(preferenceScope, { selectedModuleKeys: sanitizedSelection });
  };

  const openTaskDetails = (taskId: string) => {
    setSelectedTaskId(taskId);
    setPageStack(['Home', 'My Tasks', 'Task Details']);
  };

  const openVisitDetails = (visitId: string) => {
    setSelectedVisitId(visitId);
    setPageStack(['Home', 'Visits', 'Visit Details']);
  };

  const openNewVisit = () => {
    setPageStack(['Home', 'Visits', 'New Visit']);
  };

  const openPatientDetails = (patientId: string) => {
    setSelectedPatientId(patientId);
    setPageStack(['Home', 'Patients', 'Patient Details']);
  };

  const openNewPatient = () => {
    setPageStack(['Home', 'Patients', 'New Patient']);
  };

  const quickActions = useMemo<HomeDashboardQuickAction[]>(
    () => [
      {
        key: 'new-visit',
        title: 'New visit',
        subtitle: 'Log an appointment quickly',
        icon: 'calendar-plus',
        onPress: openNewVisit,
      },
      {
        key: 'new-patient',
        title: 'New patient',
        subtitle: 'Create a fresh profile',
        icon: 'account-plus',
        onPress: openNewPatient,
      },
      {
        key: 'add-action',
        title: 'Add action',
        subtitle: ' ',
        icon: 'plus-box-outline',
        onPress: () => undefined,
      },
    ],
    [openNewVisit, openNewPatient],
  );

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

    if (activePage === 'Visits') {
      if (!user.selectedFacility?.id) {
        return <InfoPlaceholder title="Visits" />;
      }

      return (
        <VisitsPanel
          token={user.token}
          facilityId={user.selectedFacility.id}
          onOpenVisitDetails={openVisitDetails}
          onOpenCreateVisit={openNewVisit}
        />
      );
    }

    if (activePage === 'Visit Details') {
      if (!user.selectedFacility?.id || !selectedVisitId) {
        return <InfoPlaceholder title="Visit Details" />;
      }

      return (
        <VisitDetailsPanel token={user.token} facilityId={user.selectedFacility.id} visitId={selectedVisitId} />
      );
    }

    if (activePage === 'New Visit') {
      if (!user.selectedFacility?.id) {
        return <InfoPlaceholder title="New Visit" />;
      }

      return (
        <NewVisitPanel
          token={user.token}
          facilityId={user.selectedFacility.id}
          facilityName={activeFacilityName}
          displayName={displayName || user.userName || 'Clinician'}
          onProfilePress={() => setIsProfileMenuVisible(true)}
          onViewVisits={() => setPageStack(['Home', 'Visits'])}
          onSaved={() => setPageStack(['Home'])}
        />
      );
    }

    if (activePage === 'My Attendance') {
      return <AttendancePanel />;
    }

    if (activePage === 'Patients') {
      if (!user.selectedFacility?.id) {
        return <InfoPlaceholder title="Patients" />;
      }

      return (
        <PatientsPanel
          token={user.token}
          facilityId={user.selectedFacility.id}
          onOpenPatientDetails={openPatientDetails}
          onOpenCreatePatient={openNewPatient}
        />
      );
    }

    if (activePage === 'Patient Details') {
      if (!user.selectedFacility?.id || !selectedPatientId) {
        return <InfoPlaceholder title="Patient Details" />;
      }

      return (
        <PatientDetailsPanel token={user.token} facilityId={user.selectedFacility.id} patientId={selectedPatientId} />
      );
    }

    if (activePage === 'New Patient') {
      if (!user.selectedFacility?.id) {
        return <InfoPlaceholder title="New Patient" />;
      }

      return (
        <NewPatientPanel
          token={user.token}
          facilityId={user.selectedFacility.id}
          facilityName={activeFacilityName}
          displayName={displayName || user.userName || 'Clinician'}
          onProfilePress={() => setIsProfileMenuVisible(true)}
          onViewPatients={() => setPageStack(['Home', 'Patients'])}
          onSaved={() => setPageStack(['Home'])}
        />
      );
    }

    if (activePage === "Home") {
      return (
        <SafeAreaView
          style={styles.homeScreen}
          edges={["top", "left", "right", "bottom"]}
        >
          <HomeDashboard
            displayName={displayName || user.userName || "Clinician"}
            quickActions={quickActions}
            summaryItems={summaryItems}
            modules={homeCards}
            onOpenPreferences={() => setIsPreferencesVisible(true)}
            onOpenProfilePanel={() => setIsProfileMenuVisible(true)}
            onSummaryItemPress={handleSummaryItemPress}
          />

          {user.selectedFacility?.id && selectedSummaryMetric ? (
            <SummaryDetailModal
              visible={isSummaryModalVisible}
              title={selectedSummaryTitle || "Summary"}
              metric={selectedSummaryMetric}
              token={user.token}
              facilityId={user.selectedFacility.id}
              onClose={() => {
                setIsSummaryModalVisible(false);
                setSelectedSummaryMetric(null);
                setSelectedSummaryTitle("");
              }}
              onSelectItem={(selection) => {
                setIsSummaryModalVisible(false);
                setSelectedSummaryMetric(null);
                setSelectedSummaryTitle("");

                if (selection.kind === "task") {
                  openTaskDetails(selection.id);
                  return;
                }

                if (selection.kind === "patient") {
                  openPatientDetails(selection.id);
                  return;
                }

                openVisitDetails(selection.id);
              }}
            />
          ) : null}
        </SafeAreaView>
      );
    }

    if (activePage === 'Enquiries' || activePage === 'Billing') {
      return <InfoPlaceholder title={activePage} />;
    }

    return <InfoPlaceholder title={activePage} />;
  };

  

  return (
    <SafeAreaView style={isFullScreenFlow ? styles.homeScreen : styles.screen} edges={['left', 'right', 'bottom']}>
      <View style={[styles.contentWrap, isFullScreenFlow ? styles.contentWrapFullScreen : null]}>
        {!isFullScreenFlow ? (
          <View style={[styles.headerRow, { paddingHorizontal: layout.horizontalPadding, paddingTop: layout.isTablet ? 16 : 12 }]}>
            <View style={styles.headerLogoWrap}>
              <BrandLogo />
            </View>

            <View style={styles.brandTextWrap}>
              <Text numberOfLines={1} style={styles.brandTitle}>
                {activeFacilityName}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Switch facility" onPress={() => setIsFacilityModalVisible(true)} style={styles.facilityAction}>
                <IconButton icon="swap-horizontal" size={16} iconColor={themeColors.secondary} style={styles.headerActionIcon} />
              </Pressable>

              <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => setIsProfileMenuVisible(true)}>
                <Avatar.Text size={36} label={user.userName.trim().charAt(0).toUpperCase() || 'U'} labelStyle={styles.avatarLabel} style={styles.avatar} />
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={[styles.contentScroll, !isFullScreenFlow ? { paddingBottom: insets.bottom } : null]}>
          {renderPageContent()}
        </View>
        {!isFullScreenFlow ? (
          <View style={[styles.bottomNav, { paddingHorizontal: layout.horizontalPadding }]}>
            {bottomNavItems.map((item) => (
              <Pressable
                key={item.key}
                style={styles.bottomNavItemWrap}
                onPress={() => navigateRootPage(item.key === 'Home' ? 'Home' : item.key)}
              >
                <IconButton
                  icon={item.icon}
                  size={16}
                  iconColor={activeBottomBarKey === item.key ? themeColors.primary : themeColors.textSecondary}
                  style={styles.bottomNavIcon}
                />
                <Text style={activeBottomBarKey === item.key ? styles.bottomNavLabelActive : styles.bottomNavLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <ProfileMenu
        visible={isProfileMenuVisible}
        displayName={displayName}
        email={user.email}
        onViewAttendance={() => {
          setIsProfileMenuVisible(false);
          navigateRootPage('My Attendance');
        }}
        onClose={() => setIsProfileMenuVisible(false)}
        onSignOut={() => {
          setIsProfileMenuVisible(false);
          void onSignOut();
        }}
      />

      <BottomBarPreferencesModal
        visible={isPreferencesVisible}
        options={preferenceOptions}
        selectedKeys={bottomBarModules}
        onClose={() => setIsPreferencesVisible(false)}
        onSave={(selectedKeys) => {
          void handleSaveBottomBarPreferences(selectedKeys);
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
  homeScreen: {
    flex: 1,
    backgroundColor: themeColors.surface,
  },
  headerLogoWrap: {
    width: 70,
    height: 30,
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
  contentWrap: {
    flex: 1,
    paddingBottom: 4,
  },
  contentWrapFullScreen: {
    paddingBottom: 0,
  },
  headerActionIcon: {
    margin: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
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
  brandTitle: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
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