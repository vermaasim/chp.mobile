import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, IconButton, Text } from 'react-native-paper';
import {AppBar} from '../components/AppBar'
import { AttendancePanel } from '../components/AttendancePanel';
import { FacilitySwitchModal } from '../components/FacilitySwitchModal';
import { InfoPlaceholder } from '../components/InfoPlaceholder';
import { MyTasksPanel } from '../components/MyTasksPanel';
import { ProfileMenu } from '../components/ProfileMenu';
import { SideMenu, type SideMenuItem } from '../components/SideMenu';
import { TaskDetailsPanel } from '../components/TaskDetailsPanel';
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

type PageKey = 'Home' | 'My Tasks' | 'My Attendance' | 'Task Details';

const ATTENDANCE_RADIUS_METERS = 100;
const LOCATION_REFRESH_INTERVAL_MS = 30000;

const menuItems: SideMenuItem[] = [
  // { key: 'Home', label: 'Home' },
  { key: 'My Tasks', label: 'My Tasks' },
  { key: 'My Attendance', label: 'My Attendance' },
];

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

  const breadcrumbText = useMemo(() => pageStack.map(getBreadcrumbLabel).join(' / '), [pageStack]);
  const isBackDisabled = pageStack.length <= 1;

  const navigateRootPage = (page: Exclude<PageKey, 'Task Details'>) => {
    if (page === 'Home') {
      setPageStack(['Home']);
      setSelectedTaskId(null);
      return;
    }

    setPageStack(['Home', page]);
  };

  const goBack = () => {
    if (isBackDisabled) {
      return;
    }

    setPageStack((previousStack) => previousStack.slice(0, -1));
  };

  const handleSelectMenuItem = (key: string) => {
    navigateRootPage(key as Exclude<PageKey, 'Task Details'>);
    setIsMenuVisible(false);
  };

  const goToMyAttendance = () => {
    navigateRootPage('My Attendance');
  };

  const goToMyTasks = () => {
    navigateRootPage('My Tasks');
  }

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
      if (!selectedTaskId) {
        return <InfoPlaceholder title="Task Details" />;
      }

      return (
        <TaskDetailsPanel
          token={user.token}
          taskId={selectedTaskId}
          allowedPrescriptionTypes={getAllowedPrescriptionTypes(user)}
        />
      );
    }

    if (activePage === 'My Attendance') {
      return <AttendancePanel />;
    }
    if(activePage === "Home"){
      return (
        <View style={styles.quickActionsRow}>
          <Card
            mode="outlined"
            onPress={goToMyTasks}
            style={styles.quickActionCard}
          >
            <Card.Content style={styles.quickActionCardContent}>
              <IconButton icon="clipboard-text-outline" size={28} iconColor={themeColors.primary} />
              <Text style={styles.quickActionLabel}>My Tasks</Text>
            </Card.Content>
          </Card>
          <Card
            mode="outlined"
            onPress={goToMyAttendance}
            style={styles.quickActionCard}
          >
            <Card.Content style={styles.quickActionCardContent}>
              <IconButton icon="calendar-month-outline" size={28} iconColor={themeColors.primary} />
              <Text style={styles.quickActionLabel}>My Attendance</Text>
            </Card.Content>
          </Card>
        </View>
      );
    }

    return <InfoPlaceholder title={activePage} />;
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <View
        style={[
          styles.contentWrap,
        ]}
      >
        <AppBar
          title="Click Health Pro"
          logoSource={require('../../assets/chp-logo.png')}
          facilityName={user.selectedFacility?.name ?? user.companyName}
          userLabel={displayName || user.userName || "U"}
          onMenuPress={() => setIsMenuVisible(true)}
          onFacilityPress={() => setIsFacilityModalVisible(true)}
          onProfilePress={() => setIsProfileMenuVisible(true)}
        />

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

        <View
          style={[styles.contentScroll, { paddingBottom: insets.bottom + 16 }]}
          //contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        >
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
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  fixedHeaderWrap: {
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
  },
  breadcrumbWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    justifyContent: 'flex-start',
    gap: 6,
  },
  backButton: {
    margin: 0,
  },
  breadcrumbLink: {
    color: themeColors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  breadcrumbSeparator: {
    color: themeColors.textSecondary,
    fontSize: 13,
  },
  breadcrumbCurrent: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    minHeight: 120,
    borderRadius: 16,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  quickActionCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    gap: 8,
  },
  quickActionLabel: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  userInfoCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(11, 18, 34, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  userSubtitle: {
    color: '#93A3BB',
    fontSize: 13,
    lineHeight: 18,
  },
});