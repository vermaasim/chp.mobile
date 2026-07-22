import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { allStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';

interface SpeechEnabledMultilineInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  numberOfLines?: number;
  speechLocale?: string;
}

export function SpeechEnabledMultilineInput({
  value,
  onChangeText,
  placeholder,
  numberOfLines = 4,
  speechLocale = 'hi-IN',
}: SpeechEnabledMultilineInputProps) {
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [draftText, setDraftText] = useState(value);
  const [draftHistory, setDraftHistory] = useState<string[]>([]);
  const [isRewriting, setIsRewriting] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'hi-IN' | 'en-US'>(speechLocale.startsWith('hi') ? 'hi-IN' : 'en-US');
  const latestDraftRef = useRef(value);
  const committedDraftRef = useRef(value.trim());
  const recordingBaseRef = useRef('');
  const micPressedRef = useRef(false);

  const setDraftWithHistory = useCallback((nextText: string) => {
    setDraftText((previousText) => {
      if (previousText === nextText) {
        return previousText;
      }

      setDraftHistory((previousHistory) => [...previousHistory, previousText]);
      committedDraftRef.current = nextText.trim();
      return nextText;
    });
  }, []);

  const onFinalTranscript = useCallback(
    (nextTranscript: string) => {
      const trimmedTranscript = nextTranscript.trim();

      if (!trimmedTranscript) {
        return;
      }

      const previousCommitted = committedDraftRef.current;
      const nextCommitted = previousCommitted ? `${previousCommitted} ${trimmedTranscript}` : trimmedTranscript;

      setDraftHistory((previousHistory) => [...previousHistory, previousCommitted]);
      committedDraftRef.current = nextCommitted;
      recordingBaseRef.current = `${nextCommitted} `;
      setDraftText(nextCommitted);
    },
    []
  );

  const { isListening, isAnotherFieldListening, partialTranscript, errorMessage, startListening, stopListening } = useSpeechToText({
    locale: speechLanguage,
    onFinalTranscript,
  });

  useEffect(() => {
    setSpeechLanguage(speechLocale.startsWith('hi') ? 'hi-IN' : 'en-US');
  }, [speechLocale]);

  useEffect(() => {
    latestDraftRef.current = draftText;
  }, [draftText]);

  useEffect(() => {
    if (!assistantVisible) {
      return;
    }

    setDraftText(value);
    committedDraftRef.current = value.trim();
  }, [assistantVisible, value]);

  useEffect(() => {
    if (!isListening) {
      return;
    }

    const nextText = `${recordingBaseRef.current}${partialTranscript}`.trim();

    if (nextText) {
      setDraftText(nextText);
    }
  }, [isListening, partialTranscript]);

  const openAssistant = () => {
    if (isAnotherFieldListening) {
      return;
    }

    setDraftText(value);
    committedDraftRef.current = value.trim();
    setDraftHistory([]);
    setAssistantVisible(true);
  };

  const closeAssistant = () => {
    if (isListening) {
      stopListening();
    }

    micPressedRef.current = false;
    setIsRewriting(false);
    setAssistantVisible(false);
    setDraftText(value);
    committedDraftRef.current = value.trim();
    setDraftHistory([]);
  };

  const acceptDraft = () => {
    onChangeText(draftText);
    closeAssistant();
  };

  const handleMicPressIn = async () => {
    if (isAnotherFieldListening) {
      return;
    }

    micPressedRef.current = true;
    committedDraftRef.current = latestDraftRef.current.trim();
    recordingBaseRef.current = committedDraftRef.current;
    if (recordingBaseRef.current) {
      recordingBaseRef.current = `${recordingBaseRef.current} `;
    }

    await startListening();

    if (!micPressedRef.current) {
      stopListening();
    }
  };

  const handleMicPressOut = () => {
    micPressedRef.current = false;
    stopListening();
  };

  const rewriteWithAi = async () => {
    if (isRewriting) {
      return;
    }

    setIsRewriting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setDraftWithHistory('AI rewritten draft placeholder text. Replace this mock response with the real API result later.');
    } finally {
      setIsRewriting(false);
    }
  };

  const undoLastEdit = () => {
    setDraftHistory((previousHistory) => {
      if (previousHistory.length === 0) {
        return previousHistory;
      }

      const previousValue = previousHistory[previousHistory.length - 1] ?? '';
      setDraftText(previousValue);
      committedDraftRef.current = previousValue.trim();
      return previousHistory.slice(0, -1);
    });
  };

  const clearDraft = () => {
    if (!draftText.trim()) {
      return;
    }

    setDraftWithHistory('');
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={{ position: 'relative' }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          multiline
          numberOfLines={numberOfLines}
          style={[allStyles.input, allStyles.textArea, { paddingRight: 42 }]}
          placeholder={placeholder}
        />
        <Pressable
          onPress={openAssistant}
          disabled={isAnotherFieldListening && !isListening}
          accessibilityRole="button"
          accessibilityLabel="Open speech assistant"
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: isListening ? themeColors.secondary : themeColors.border,
            backgroundColor: isListening ? '#FFF1E8' : themeColors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isAnotherFieldListening && !isListening ? 0.4 : 1,
          }}
        >
          <Feather name="mic" size={14} color={isAnotherFieldListening ? themeColors.textSecondary : themeColors.secondary} />
        </Pressable>
      </View>

      <Modal animationType="fade" transparent visible={assistantVisible} onRequestClose={closeAssistant}>
        <View style={componentStyles.overlay}>
          <Pressable style={componentStyles.backdrop} onPress={closeAssistant} />
          <View style={componentStyles.sheet}>
            <View style={componentStyles.sheetHeader}>
              <View style={componentStyles.headerLeftRow}>
                <View style={[componentStyles.headerCopy]}>
                  <Text style={componentStyles.sheetTitle}>Speech Assistant</Text>
                  <Text style={componentStyles.sheetSubtitle}>Hold the mic to record. Rewrite with AI when ready.</Text>
                </View>

                <View style={[componentStyles.languageSwitchRow]}>
                  <Text style={[componentStyles.languageLabel, speechLanguage === 'en-US' ? componentStyles.languageLabelActive : null]}>English</Text>
                  <Switch
                    value={speechLanguage === 'hi-IN'}
                    onValueChange={(nextValue) => setSpeechLanguage(nextValue ? 'hi-IN' : 'en-US')}
                    trackColor={{ false: themeColors.border, true: themeColors.successBorder }}
                    thumbColor={speechLanguage === 'hi-IN' ? themeColors.primary : themeColors.surface}
                    ios_backgroundColor={themeColors.border}
                  />
                  <Text style={[componentStyles.languageLabel, speechLanguage === 'hi-IN' ? componentStyles.languageLabelActive : null]}>Hindi</Text>
                </View>
              </View>

              <Pressable onPress={closeAssistant} accessibilityRole="button" accessibilityLabel="Close speech assistant" style={componentStyles.iconButton}>
                <Feather name="x" size={16} color={themeColors.textPrimary} />
              </Pressable>
            </View>

            <TextInput
              value={draftText}
              onChangeText={setDraftWithHistory}
              multiline
              numberOfLines={6}
              style={[allStyles.input, allStyles.textArea, componentStyles.draftInput]}
              placeholder="Dictated text appears here"
              placeholderTextColor={themeColors.textSecondary}
            />

            {isListening ? <Text style={componentStyles.listeningText}>Listening while pressed...</Text> : null}
            {partialTranscript ? <Text style={componentStyles.partialText}>Heard: {partialTranscript}</Text> : null}
            {errorMessage ? <Text style={allStyles.errorText}>{errorMessage}</Text> : null}

            <View style={componentStyles.actionRow}>
              <Pressable
                onPress={undoLastEdit}
                disabled={draftHistory.length === 0}
                accessibilityRole="button"
                accessibilityLabel="Undo last draft edit"
                style={({ pressed }) => [
                  componentStyles.roundAction,
                  draftHistory.length === 0 ? componentStyles.roundActionDisabled : null,
                  pressed ? componentStyles.roundActionPressed : null,
                ]}
              >
                <Feather name="rotate-ccw" size={18} color={themeColors.textSecondary} />
              </Pressable>

              <Pressable
                onPress={clearDraft}
                disabled={!draftText.trim()}
                accessibilityRole="button"
                accessibilityLabel="Clear draft text"
                style={({ pressed }) => [
                  componentStyles.roundAction,
                  !draftText.trim() ? componentStyles.roundActionDisabled : null,
                  pressed ? componentStyles.roundActionPressed : null,
                ]}
              >
                <Feather name="trash-2" size={18} color={themeColors.textSecondary} />
              </Pressable>

              <Pressable
                onPressIn={() => void handleMicPressIn()}
                onPressOut={handleMicPressOut}
                disabled={isAnotherFieldListening && !isListening}
                accessibilityRole="button"
                accessibilityLabel="Hold to record speech"
                style={({ pressed }) => [
                  componentStyles.roundAction,
                  isListening ? componentStyles.roundActionActive : null,
                  (isAnotherFieldListening && !isListening) ? componentStyles.roundActionDisabled : null,
                  pressed ? componentStyles.roundActionPressed : null,
                ]}
              >
                {isListening ? (
                  <View style={componentStyles.recordingDot} />
                ) : (
                  <Feather name="mic" size={18} color={themeColors.secondary} />
                )}
              </Pressable>

              <Pressable
                onPress={() => void rewriteWithAi()}
                disabled={isRewriting}
                accessibilityRole="button"
                accessibilityLabel="Rewrite text with AI"
                style={({ pressed }) => [
                  componentStyles.roundAction,
                  componentStyles.aiAction,
                  isRewriting ? componentStyles.roundActionDisabled : null,
                  pressed ? componentStyles.roundActionPressed : null,
                ]}
              >
                {isRewriting ? <ActivityIndicator size="small" color={themeColors.primary} /> : <Feather name="refresh-cw" size={18} color={themeColors.primary} />}
              </Pressable>

              <Pressable
                onPress={acceptDraft}
                accessibilityRole="button"
                accessibilityLabel="Accept text"
                style={({ pressed }) => [componentStyles.roundAction, componentStyles.acceptAction, pressed ? componentStyles.roundActionPressed : null]}
              >
                <Feather name="check" size={18} color={themeColors.textOnBrand} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const componentStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31, 45, 47, 0.42)',
  },
  sheet: {
    backgroundColor: themeColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderColor: themeColors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCopy: {
    flexShrink: 1,
    gap: 4,
  },
  headerCopyCard: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sheetTitle: {
    color: themeColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  languageSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageSwitchCard: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  languageLabel: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  languageLabelActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftInput: {
    minHeight: 140,
  },
  listeningText: {
    color: themeColors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  partialText: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  roundAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surface,
  },
  roundActionActive: {
    borderColor: themeColors.secondary,
    backgroundColor: themeColors.warningSurface,
  },
  aiAction: {
    backgroundColor: themeColors.successSurface,
    borderColor: themeColors.successBorder,
  },
  acceptAction: {
    flex: 0.9,
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  roundActionPressed: {
    opacity: 0.75,
  },
  roundActionDisabled: {
    opacity: 0.4,
  },
  recordingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: themeColors.secondary,
  },
});
