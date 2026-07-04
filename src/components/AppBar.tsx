import { Image, type ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';
import { Appbar, Avatar, Surface, Text } from 'react-native-paper';
import { themeColors } from '../theme/colors';

interface AppBarProps {
  title: string;
  logoSource?: ImageSourcePropType;
  facilityName: string;
  userLabel: string;
  onMenuPress: () => void;
  onFacilityPress: () => void;
  onProfilePress: () => void;
}

export function AppBar({
  title,
  logoSource,
  facilityName,
  userLabel,
  onMenuPress,
  onFacilityPress,
  onProfilePress,
}: AppBarProps) {
  return (
      <Appbar.Header style={styles.topRow} elevated={false}>
        <Appbar.Action
          icon="menu"
          size={20}
          iconColor={themeColors.primary}
          style={styles.iconButton}
          onPress={onMenuPress}
          accessibilityLabel="Open menu"
        />

        <View style={styles.centerWrap}>
          {logoSource ? (
            <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <Text numberOfLines={1} style={styles.subTitle}>{title}</Text>
          )}
          <View style={styles.facilityRow}>
            <Text numberOfLines={1} style={styles.facilityText}>{facilityName}</Text>
            <Appbar.Action
              icon="swap-horizontal"
              size={16}
              iconColor={themeColors.secondary}
              style={styles.facilitySwitchButton}
              onPress={onFacilityPress}
              accessibilityLabel="Switch facility"
            />
          </View>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Open profile menu" onPress={onProfilePress}>
          <Avatar.Text
            size={36}
            label={userLabel.slice(0, 1).toUpperCase()}
            style={styles.profileButton}
            labelStyle={styles.profileInitial}
          />
        </Pressable>
      </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  topRow: {
    backgroundColor: 'transparent',
    height: 76,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  iconButton: {
    margin: 0,
    backgroundColor: themeColors.surfaceMuted,
  },
  centerWrap: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  subTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  logoImage: {
    width: 150,
    height: 30,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityText: {
    color: themeColors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 220,
    textAlign: 'center',
  },
  facilitySwitchButton: {
    margin: 0,
    backgroundColor: themeColors.surfaceMuted,
  },
  profileButton: {
    backgroundColor: themeColors.primary,
  },
  profileInitial: {
    color: themeColors.textOnBrand,
    fontSize: 14,
    fontWeight: '700',
  },
});
