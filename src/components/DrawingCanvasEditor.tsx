import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
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
}

const PALETTE = ['#111827', '#ef4444', '#22c55e', '#3b82f6', '#f97316', '#a855f7'];
const STROKE_WIDTHS = [2, 4, 6, 9, 12];

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

export function DrawingCanvasEditor({ initialJson, readOnly, onChange }: DrawingCanvasEditorProps) {
  const initialData = useMemo(() => parseInitialDrawing(initialJson), [initialJson]);
  const [strokes, setStrokes] = useState<DrawingStroke[]>(initialData.strokes);
  const [activePoints, setActivePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [strokeColor, setStrokeColor] = useState(PALETTE[0]);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTHS[1]);
  const [canvasWidth, setCanvasWidth] = useState(320);
  const [canvasHeight, setCanvasHeight] = useState(320);
  const [eraserEnabled, setEraserEnabled] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

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
        color: eraserEnabled ? '#ffffff' : strokeColor,
        width: eraserEnabled ? Math.max(14, strokeWidth * 2) : strokeWidth,
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
    [eraserEnabled, readOnly, strokeColor, strokeWidth]
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

  return (
    <View style={styles.wrap}>
      {!readOnly ? (
        <View style={styles.toolbar}>
          <View style={styles.row}>
            {PALETTE.map((color) => {
              const isActive = strokeColor === color && !eraserEnabled;
              return (
                <Pressable
                  key={color}
                  onPress={() => {
                    setStrokeColor(color);
                    setEraserEnabled(false);
                  }}
                  style={[styles.colorSwatch, { backgroundColor: color }, isActive ? styles.colorSwatchActive : null]}
                />
              );
            })}
          </View>

          <View style={styles.row}>
            {STROKE_WIDTHS.map((width) => (
              <Pressable
                key={width}
                onPress={() => setStrokeWidth(width)}
                style={[styles.sizeChip, strokeWidth === width ? styles.sizeChipActive : null]}
              >
                <Text style={[styles.sizeChipText, strokeWidth === width ? styles.sizeChipTextActive : null]}>{width}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <Pressable
              style={[styles.actionChip, eraserEnabled ? styles.actionChipActive : null]}
              onPress={() => setEraserEnabled((value) => !value)}
            >
              <Text style={[styles.actionChipText, eraserEnabled ? styles.actionChipTextActive : null]}>Eraser</Text>
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
        style={styles.canvasWrap}
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
              stroke={eraserEnabled ? '#ffffff' : strokeColor}
              strokeWidth={eraserEnabled ? Math.max(14, strokeWidth * 2) : strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
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
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    minHeight: 320,
    height: 360,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
});
