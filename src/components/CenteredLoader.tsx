import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Text } from 'react-native-paper';
import { themeColors } from '../theme/colors';

interface CenteredLoaderProps {
  message?: string;
  fullScreen?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function CenteredLoader({ message = 'Loading...', fullScreen = false, containerStyle }: CenteredLoaderProps) {
  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : null, containerStyle]}>
      <Image
        source={require('../../assets/Animated_icon_clockwise.gif')}
        style={styles.loaderImage}
        contentFit="contain"
        accessibilityLabel="Loading"
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fullScreen: {
    flex: 1,
  },
  loaderImage: {
    width: 68,
    height: 68,
  },
  message: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
