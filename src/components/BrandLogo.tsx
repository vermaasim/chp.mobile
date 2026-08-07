import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

interface BrandLogoProps {
  width?: number;
  height?: number;
}

export function BrandLogo({ width = 65, height = 30 }: BrandLogoProps) {
  return (
    <View style={[styles.wrap, { width, height }]}>
      <Image
        source={require('../../assets/chp-logo.png')}
        style={styles.image}
        contentFit="contain"
        accessibilityLabel="Click Health Pro logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});