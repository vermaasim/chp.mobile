import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DRAWING_PALETTE, DRAWING_STROKE_WIDTHS } from '../../DrawingCanvasEditor';
import { themeColors } from '../../../theme/colors';
import { DrawingToolDropdown } from './DrawingToolDropdown';

interface DrawingControlsBarProps {
  strokeColor: string;
  strokeWidth: number;
  eraserEnabled: boolean;
  isCanvasFullscreen: boolean;
  onStrokeColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onToggleEraser: () => void;
  onUndo: () => void;
  onClear: () => void;
  onToggleFullscreen: () => void;
}

export function DrawingControlsBar({
  strokeColor,
  strokeWidth,
  eraserEnabled,
  isCanvasFullscreen,
  onStrokeColorChange,
  onStrokeWidthChange,
  onToggleEraser,
  onUndo,
  onClear,
  onToggleFullscreen,
}: DrawingControlsBarProps) {
  return (
    <View style={styles.row}>
      <View style={styles.colorDropdownWrap}>
        <DrawingToolDropdown
          selectedValue={strokeColor}
          options={DRAWING_PALETTE.map((color) => ({ label: '', value: color, accentColor: color }))}
          onSelect={onStrokeColorChange}
          styleVariant="compact"
        />
      </View>

      <View style={styles.thicknessDropdownWrap}>
        <DrawingToolDropdown
          selectedValue={strokeWidth}
          options={DRAWING_STROKE_WIDTHS.map((width) => ({ label: `${width}px`, value: width }))}
          onSelect={onStrokeWidthChange}
          styleVariant="compact"
        />
      </View>

      <Pressable
        accessibilityRole="button"
        style={[styles.iconButton, eraserEnabled ? styles.iconButtonActive : null]}
        onPress={onToggleEraser}
      >
        <Feather name="delete" size={14} color={eraserEnabled ? themeColors.primary : themeColors.textSecondary} />
      </Pressable>

      <Pressable accessibilityRole="button" style={styles.iconButton} onPress={onUndo}>
        <Feather name="rotate-ccw" size={14} color={themeColors.textSecondary} />
      </Pressable>

      <Pressable accessibilityRole="button" style={styles.iconButton} onPress={onClear}>
        <Feather name="trash-2" size={14} color={themeColors.textSecondary} />
      </Pressable>

      <Pressable accessibilityRole="button" style={styles.fullscreenButton} onPress={onToggleFullscreen}>
        <Feather name={isCanvasFullscreen ? 'minimize-2' : 'maximize-2'} size={15} color={themeColors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    zIndex: 40,
    overflow: 'visible',
  },
  colorDropdownWrap: {
    width: 52,
    zIndex: 50,
    overflow: 'visible',
  },
  thicknessDropdownWrap: {
    width: 72,
    zIndex: 49,
    overflow: 'visible',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.successSurface,
  },
  fullscreenButton: {
    marginLeft: 'auto',
    width: 38,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});