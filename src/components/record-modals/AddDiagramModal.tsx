import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDrawingRecord, updateDrawingRecord } from '../../api/records';
import { DrawingCanvasEditor, type DrawingCanvasEditorHandle, DRAWING_PALETTE, DRAWING_STROKE_WIDTHS } from '../DrawingCanvasEditor';
import type { AddRecordModalProps } from '../AddRecordModal';
import { allStyles } from '../../styles/commonStyles';
import { themeColors } from '../../theme/colors';
import { DrawingControlsBar } from './drawing/DrawingControlsBar';

type AddDiagramModalProps = Omit<AddRecordModalProps, 'template'>;

const EMPTY_DRAWING_JSON = JSON.stringify({ version: 'mobile-1', background: '#ffffff', strokes: [] });

export function AddDiagramModal({ visible, token, serviceId, editingRecord, onClose, onSaved }: AddDiagramModalProps) {
  const insets = useSafeAreaInsets();
  const canvasRef = useRef<DrawingCanvasEditorHandle>(null);
  const [drawingName, setDrawingName] = useState('');
  const [drawingJson, setDrawingJson] = useState(EMPTY_DRAWING_JSON);
  const [strokeColor, setStrokeColor] = useState(DRAWING_PALETTE[0]);
  const [strokeWidth, setStrokeWidth] = useState(DRAWING_STROKE_WIDTHS[1]);
  const [eraserEnabled, setEraserEnabled] = useState(false);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEditing = editingRecord?.type === 'drawing';

  useEffect(() => {
    if (!visible) {
      return;
    }

    setErrorMessage(null);
    setSaving(false);
    setStrokeColor(DRAWING_PALETTE[0]);
    setStrokeWidth(DRAWING_STROKE_WIDTHS[1]);
    setEraserEnabled(false);
    setIsCanvasFullscreen(false);

    if (editingRecord?.type === 'drawing') {
      setDrawingName(editingRecord.drawing?.name ?? '');
      setDrawingJson(editingRecord.drawing?.diagramJson ?? EMPTY_DRAWING_JSON);
      return;
    }

    setDrawingName('');
    setDrawingJson(EMPTY_DRAWING_JSON);
  }, [editingRecord, visible]);

  const closeModal = () => {
    setErrorMessage(null);
    onClose();
  };

  const saveDrawing = async () => {
    if (!serviceId) {
      setErrorMessage('Service is not selected.');
      return;
    }

    if (!drawingName.trim()) {
      setErrorMessage('Please provide a drawing name.');
      return;
    }

    setErrorMessage(null);
    setSaving(true);

    try {
      if (isEditing && editingRecord?.id) {
        await updateDrawingRecord(token, editingRecord.id, drawingName.trim(), drawingJson);
      } else {
        await addDrawingRecord(token, {
          serviceId,
          name: drawingName.trim(),
          diagramJson: drawingJson,
        });
      }

      await onSaved('drawing');
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save drawing.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={closeModal}>
      <View style={styles.screen}>
        {!isCanvasFullscreen ? <View style={styles.modalCard} /> : null}
        {!isCanvasFullscreen ? (
          <View style={[styles.header, { paddingTop: Math.max(18, insets.top + 6) }]}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{isEditing ? 'Edit drawing' : 'Add drawing'}</Text>
              <Text style={styles.subtitle}>Body map annotation</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={closeModal} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.body,
            isCanvasFullscreen ? styles.bodyFullscreen : null,
            isCanvasFullscreen ? { paddingTop: Math.max(8, insets.top + 2) } : null,
          ]}
        >
          {!isCanvasFullscreen && errorMessage ? <Text style={allStyles.errorText}>{errorMessage}</Text> : null}

          {!isCanvasFullscreen ? (
            <View style={styles.nameFieldCard}>
              <TextInput
                value={drawingName}
                onChangeText={setDrawingName}
                style={styles.nameInput}
                placeholder="Drawing name"
                placeholderTextColor={themeColors.textSecondary}
              />
            </View>
          ) : null}

          <View style={styles.controlsRowWrap}>
            <DrawingControlsBar
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              eraserEnabled={eraserEnabled}
              isCanvasFullscreen={isCanvasFullscreen}
              onStrokeColorChange={setStrokeColor}
              onStrokeWidthChange={setStrokeWidth}
              onToggleEraser={() => setEraserEnabled((currentValue) => !currentValue)}
              onUndo={() => canvasRef.current?.undoStroke()}
              onClear={() => canvasRef.current?.clearCanvas()}
              onToggleFullscreen={() => setIsCanvasFullscreen((currentValue) => !currentValue)}
            />
          </View>

          <View style={[styles.canvasSection, isCanvasFullscreen ? styles.canvasSectionFullscreen : null]}>
            <DrawingCanvasEditor
              ref={canvasRef}
              initialJson={drawingJson}
              onChange={setDrawingJson}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              eraserEnabled={eraserEnabled}
              onEraserEnabledChange={setEraserEnabled}
              showToolbar={false}
              canvasStyle={[styles.canvas, isCanvasFullscreen ? styles.canvasFullscreen : null]}
            />
          </View>
        </View>

        {!isCanvasFullscreen ? (
          <View style={[styles.footer, { paddingBottom: Math.max(14, insets.bottom + 14) }]}>
            <Pressable
              style={[allStyles.filterButton, styles.saveButton, saving ? allStyles.disabledButton : null]}
              disabled={saving}
              onPress={() => void saveDrawing()}
            >
              <Text style={allStyles.filterButtonText}>{saving ? 'Saving...' : isEditing ? 'Update drawing' : 'Save drawing'}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EDF2F3',
  },
  modalCard: {
    ...StyleSheet.absoluteFillObject,
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 20,
    backgroundColor: themeColors.surface,
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 6,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: themeColors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
  },
  closeButton: {
    minHeight: 34,
    justifyContent: 'center',
  },
  closeText: {
    color: themeColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 8,
  },
  bodyFullscreen: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  controlsRowWrap: {
    zIndex: 50,
    elevation: 22,
    overflow: 'visible',
    borderRadius: 10,
  },
  nameFieldCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nameInput: {
    color: themeColors.textPrimary,
    fontSize: 13,
    paddingVertical: 1,
  },
  canvasSection: {
    flex: 1,
    minHeight: 0,
    zIndex: 1,
    overflow: 'visible',
  },
  canvasSectionFullscreen: {
    flex: 1,
  },
  canvas: {
    flex: 1,
    minHeight: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  canvasFullscreen: {
    borderRadius: 10,
  },
  footer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  saveButton: {
    marginTop: 0,
  },
});
