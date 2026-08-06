import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { themeColors } from '../theme/colors';

export interface DrawingStroke {
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
}

export interface MobileDrawingPayload {
  version: 'mobile-1';
  background: string;
  strokes: DrawingStroke[];
}

interface DrawingCanvasEditorProps {
  initialJson?: string;
  readOnly?: boolean;
  onChange?: (json: string) => void;
  strokeColor?: string;
  strokeWidth?: number;
  eraserEnabled?: boolean;
  onStrokeColorChange?: (color: string) => void;
  onStrokeWidthChange?: (width: number) => void;
  onEraserEnabledChange?: (enabled: boolean) => void;
  showToolbar?: boolean;
  canvasStyle?: StyleProp<ViewStyle>;
}

export interface DrawingCanvasEditorHandle {
  clearCanvas: () => void;
  undoStroke: () => void;
  hasStrokes: () => boolean;
}

export const DRAWING_PALETTE = ['#111827', '#ef4444', '#22c55e', '#3b82f6', '#f97316', '#a855f7'];
export const DRAWING_STROKE_WIDTHS = [2, 4, 6, 9, 12];

function toPathD(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return '';
  }

  const start = points[0];
  let path = `M ${start.x} ${start.y}`;

  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    path += ` L ${point.x} ${point.y}`;
  }

  return path;
}

function parseInitialDrawing(json?: string): MobileDrawingPayload {
  if (!json) {
    return { version: 'mobile-1', background: '#ffffff', strokes: [] };
  }

  try {
    const parsed = JSON.parse(json) as Partial<MobileDrawingPayload>;
    if (!parsed || typeof parsed !== 'object') {
      return { version: 'mobile-1', background: '#ffffff', strokes: [] };
    }

    return {
      version: 'mobile-1',
      background: parsed.background ?? '#ffffff',
      strokes: Array.isArray(parsed.strokes) ? parsed.strokes : [],
    };
  } catch {
    return { version: 'mobile-1', background: '#ffffff', strokes: [] };
  }
}

export const DrawingCanvasEditor = forwardRef<DrawingCanvasEditorHandle, DrawingCanvasEditorProps>(function DrawingCanvasEditor(
  {
    initialJson,
    readOnly,
    onChange,
    strokeColor,
    strokeWidth,
    eraserEnabled,
    onStrokeColorChange,
    onStrokeWidthChange,
    onEraserEnabledChange,
    showToolbar,
    canvasStyle,
  },
  ref,
) {
  const initialData = useMemo(() => parseInitialDrawing(initialJson), [initialJson]);
  const [strokes, setStrokes] = useState<DrawingStroke[]>(initialData.strokes);
  const [activePoints, setActivePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [internalStrokeColor, setInternalStrokeColor] = useState(DRAWING_PALETTE[0]);
  const [internalStrokeWidth, setInternalStrokeWidth] = useState(DRAWING_STROKE_WIDTHS[1]);
  const [canvasWidth, setCanvasWidth] = useState(320);
  const [canvasHeight, setCanvasHeight] = useState(320);
  const [internalEraserEnabled, setInternalEraserEnabled] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const activeStrokeColor = strokeColor ?? internalStrokeColor;
  const activeStrokeWidth = strokeWidth ?? internalStrokeWidth;
  const activeEraserEnabled = eraserEnabled ?? internalEraserEnabled;
  const shouldShowToolbar = showToolbar ?? !readOnly;

  useEffect(() => {
    setStrokes(initialData.strokes);
    setActivePoints([]);
    lastPoint.current = null;
  }, [initialData]);

  const emitChange = (nextStrokes: DrawingStroke[]) => {
    const payload: MobileDrawingPayload = {
      version: 'mobile-1',
      background: '#ffffff',
      strokes: nextStrokes,
    };

    onChange?.(JSON.stringify(payload));
  };

  const addPoint = (x: number, y: number) => {
    if (lastPoint.current) {
      const dx = x - lastPoint.current.x;
      const dy = y - lastPoint.current.y;

      if (Math.sqrt(dx * dx + dy * dy) < 1.5) {
        return;
      }
    }

    setActivePoints((previousValue) => [...previousValue, { x, y }]);
    lastPoint.current = { x, y };
  };

  const finishStroke = () => {
    setActivePoints((previousValue) => {
      if (previousValue.length < 2) {
        return [];
      }

      const nextStroke: DrawingStroke = {
        color: activeEraserEnabled ? '#ffffff' : activeStrokeColor,
        width: activeEraserEnabled ? Math.max(14, activeStrokeWidth * 2) : activeStrokeWidth,
        points: previousValue,
      };

      setStrokes((oldStrokes) => {
        const nextStrokes = [...oldStrokes, nextStroke];
        emitChange(nextStrokes);
        return nextStrokes;
      });

      return [];
    });

    lastPoint.current = null;
  };

  useImperativeHandle(ref, () => ({
    clearCanvas,
    undoStroke,
    hasStrokes: () => strokes.length > 0,
  }), [strokes]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !readOnly,
        onMoveShouldSetPanResponder: () => !readOnly,
        onPanResponderGrant: (event) => {
          addPoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
        },
        onPanResponderMove: (event) => {
          addPoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
        },
        onPanResponderRelease: () => {
          finishStroke();
        },
        onPanResponderTerminate: () => {
          finishStroke();
        },
      }),
    [activeEraserEnabled, activeStrokeColor, activeStrokeWidth, readOnly]
  );

  const undoStroke = () => {
    setStrokes((previousValue) => {
      if (!previousValue.length) {
        return previousValue;
      }

      const nextStrokes = previousValue.slice(0, -1);
      emitChange(nextStrokes);
      return nextStrokes;
    });
  };

  const clearCanvas = () => {
    setStrokes([]);
    setActivePoints([]);
    emitChange([]);
  };

  const selectStrokeColor = (color: string) => {
    setInternalStrokeColor(color);
    onStrokeColorChange?.(color);
    setInternalEraserEnabled(false);
    onEraserEnabledChange?.(false);
  };

  const selectStrokeWidth = (width: number) => {
    setInternalStrokeWidth(width);
    onStrokeWidthChange?.(width);
  };

  const toggleEraser = () => {
    const nextValue = !activeEraserEnabled;
    setInternalEraserEnabled(nextValue);
    onEraserEnabledChange?.(nextValue);
  };

  return (
    <View style={styles.wrap}>
      {!readOnly && shouldShowToolbar ? (
        <View style={styles.toolbar}>
          <View style={styles.row}>
            {DRAWING_PALETTE.map((color) => {
              const isActive = activeStrokeColor === color && !activeEraserEnabled;
              return (
                <Pressable
                  key={color}
                  onPress={() => selectStrokeColor(color)}
                  style={[styles.colorSwatch, { backgroundColor: color }, isActive ? styles.colorSwatchActive : null]}
                />
              );
            })}
          </View>

          <View style={styles.row}>
            {DRAWING_STROKE_WIDTHS.map((width) => (
              <Pressable
                key={width}
                onPress={() => selectStrokeWidth(width)}
                style={[styles.sizeChip, activeStrokeWidth === width ? styles.sizeChipActive : null]}
              >
                <Text style={[styles.sizeChipText, activeStrokeWidth === width ? styles.sizeChipTextActive : null]}>{width}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <Pressable
              style={[styles.actionChip, activeEraserEnabled ? styles.actionChipActive : null]}
              onPress={toggleEraser}
            >
              <Text style={[styles.actionChipText, activeEraserEnabled ? styles.actionChipTextActive : null]}>Eraser</Text>
            </Pressable>
            <Pressable style={styles.actionChip} onPress={undoStroke}>
              <Text style={styles.actionChipText}>Undo</Text>
            </Pressable>
            <Pressable style={styles.actionChip} onPress={clearCanvas}>
              <Text style={styles.actionChipText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        style={[styles.canvasWrap, canvasStyle]}
        onLayout={(event) => {
          setCanvasWidth(Math.max(event.nativeEvent.layout.width, 1));
          setCanvasHeight(Math.max(event.nativeEvent.layout.height, 1));
        }}
        {...(!readOnly ? panResponder.panHandlers : {})}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#ffffff" />
          {strokes.map((stroke, index) => (
            <Path
              key={`${index}-${stroke.color}-${stroke.width}`}
              d={toPathD(stroke.points)}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {activePoints.length > 1 ? (
            <Path
              d={toPathD(activePoints)}
              stroke={activeEraserEnabled ? '#ffffff' : activeStrokeColor}
              strokeWidth={activeEraserEnabled ? Math.max(14, activeStrokeWidth * 2) : activeStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
        </Svg>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
    gap: 10,
  },
  toolbar: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  colorSwatchActive: {
    borderWidth: 2,
    borderColor: themeColors.primary,
  },
  sizeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: themeColors.surface,
  },
  sizeChipActive: {
    borderColor: themeColors.primary,
    backgroundColor: '#e9fbfb',
  },
  sizeChipText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  sizeChipTextActive: {
    color: themeColors.primary,
  },
  actionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: themeColors.surface,
  },
  actionChipActive: {
    borderColor: themeColors.primary,
    backgroundColor: '#e9fbfb',
  },
  actionChipText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  actionChipTextActive: {
    color: themeColors.primary,
  },
  canvasWrap: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
});
