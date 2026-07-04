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

type PageKey = 'Home' | 'My Tasks' | 'My Attendance';

const ATTENDANCE_RADIUS_METERS = 100;
const LOCATION_REFRESH_INTERVAL_MS = 30000;

const menuItems: SideMenuItem[] = [
  // { key: 'Home', label: 'Home' },
  { key: 'My Tasks', label: 'My Tasks' },
  { key: 'My Attendance', label: 'My Attendance' },
];

export function HomeScreen({ user, onSignOut, onSelectFacility }: HomeScreenProps) {
  const displayName = buildDisplayName(user);
  const insets = useSafeAreaInsets();
  const [activePage, setActivePage] = useState<PageKey>('Home');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [isFacilityModalVisible, setIsFacilityModalVisible] = useState(false);

  const pageTitle = useMemo(() => {
    if (activePage === 'My Tasks') {
      return 'My Tasks';
    }

    if (activePage === 'My Attendance') {
      return 'My Attendance';
    }

    return 'Home';
  }, [activePage]);

  const handleSelectMenuItem = (key: string) => {
    setActivePage(key as PageKey);
    setIsMenuVisible(false);
  };

  const goToMyAttendance = () => {
    setActivePage('My Attendance');
  };

  const goToMyTasks = () => {
    setActivePage('My Tasks');
  }

  const goToHome = () => {
    setActivePage('Home');
  };

  const renderPageContent = () => {
    if (activePage === 'My Tasks') {
      if (!user.selectedFacility?.id) {
        return <InfoPlaceholder title="My Tasks" />;
      }

      return <MyTasksPanel token={user.token} facilityId={user.selectedFacility.id} />;
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

    return <InfoPlaceholder title={pageTitle} />;
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
            {activePage === "Home" ? (
              <Text style={styles.breadcrumbCurrent}>Home</Text>
            ) : (
              <>
                <Pressable accessibilityRole="button" onPress={goToHome}>
                  <Text style={styles.breadcrumbLink}>Home</Text>
                </Pressable>
                <Text style={styles.breadcrumbSeparator}> / </Text>
                <Text style={styles.breadcrumbCurrent}>{pageTitle}</Text>
              </>
            )}
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