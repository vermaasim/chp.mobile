import { useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

interface UseSpeechToTextOptions {
  locale?: string;
  onFinalTranscript: (text: string) => void;
}

let speechFieldInstanceCounter = 0;

type ActiveSpeechOwner = {
  id: number;
  reset: () => void;
} | null;

let activeSpeechOwner: ActiveSpeechOwner = null;
const ownerSubscribers = new Set<() => void>();

function notifyOwnerSubscribers() {
  ownerSubscribers.forEach((subscriber) => subscriber());
}

function subscribeToOwnerChanges(callback: () => void) {
  ownerSubscribers.add(callback);

  return () => {
    ownerSubscribers.delete(callback);
  };
}

function setActiveSpeechOwner(nextOwner: ActiveSpeechOwner) {
  activeSpeechOwner = nextOwner;
  notifyOwnerSubscribers();
}

export function useSpeechToText({ locale = 'en-US', onFinalTranscript }: UseSpeechToTextOptions) {
  const [isListening, setIsListening] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeOwnerId, setActiveOwnerId] = useState<number | null>(activeSpeechOwner?.id ?? null);
  const mountedRef = useRef(true);
  const instanceIdRef = useRef<number>(speechFieldInstanceCounter++);

  const resetLocalState = () => {
    if (!mountedRef.current) {
      return;
    }

    setIsListening(false);
    setPartialTranscript('');
    setErrorMessage(null);
  };

  useEffect(() => {
    mountedRef.current = true;

    const unsubscribeOwner = subscribeToOwnerChanges(() => {
      if (!mountedRef.current) {
        return;
      }

      const nextOwnerId = activeSpeechOwner?.id ?? null;
      setActiveOwnerId(nextOwnerId);

      if (nextOwnerId !== instanceIdRef.current) {
        setIsListening(false);
        setPartialTranscript('');
      }
    });

    const startListener = ExpoSpeechRecognitionModule.addListener('start', () => {
      if (!mountedRef.current || activeSpeechOwner?.id !== instanceIdRef.current) {
        return;
      }

      setIsListening(true);
      setErrorMessage(null);
    });

    const endListener = ExpoSpeechRecognitionModule.addListener('end', () => {
      if (!mountedRef.current || activeSpeechOwner?.id !== instanceIdRef.current) {
        return;
      }

      setIsListening(false);
      setPartialTranscript('');
      setActiveSpeechOwner(null);
    });

    const resultListener = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
      if (!mountedRef.current || activeSpeechOwner?.id !== instanceIdRef.current) {
        return;
      }

      const transcript = event?.results?.[0]?.transcript ?? '';

      if (!transcript.trim()) {
        return;
      }

      if (event?.isFinal) {
        onFinalTranscript(transcript);
        setPartialTranscript('');
        return;
      }

      setPartialTranscript(transcript);
    });

    const errorListener = ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
      if (!mountedRef.current || activeSpeechOwner?.id !== instanceIdRef.current) {
        return;
      }

      const nextError = event?.message || event?.error || 'Unable to recognize speech.';
      setIsListening(false);
      setPartialTranscript('');
      setErrorMessage(`${nextError}`);
      setActiveSpeechOwner(null);
    });

    return () => {
      mountedRef.current = false;
      unsubscribeOwner();
      startListener.remove();
      endListener.remove();
      resultListener.remove();
      errorListener.remove();

      if (activeSpeechOwner?.id === instanceIdRef.current) {
        setActiveSpeechOwner(null);
        ExpoSpeechRecognitionModule.abort();
      }
    };
  }, [onFinalTranscript]);

  const startListening = async () => {
    if (isListening) {
      return;
    }

    setErrorMessage(null);

    try {
      if (activeSpeechOwner && activeSpeechOwner.id !== instanceIdRef.current) {
        activeSpeechOwner.reset();
        setActiveSpeechOwner(null);
        ExpoSpeechRecognitionModule.abort();
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        setErrorMessage('Microphone permission is required for voice dictation.');
        return;
      }

      setActiveSpeechOwner({
        id: instanceIdRef.current,
        reset: resetLocalState,
      });

      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        continuous: true,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start speech recognition.');
    }
  };

  const stopListening = () => {
    try {
      setIsListening(false);
      setPartialTranscript('');

      if (activeSpeechOwner?.id === instanceIdRef.current) {
        setActiveSpeechOwner(null);
      }

      ExpoSpeechRecognitionModule.stop();
    } catch {
      setIsListening(false);
      setPartialTranscript('');
    }
  };

  return {
    isListening,
    isAnotherFieldListening: activeOwnerId !== null && activeOwnerId !== instanceIdRef.current,
    partialTranscript,
    errorMessage,
    startListening,
    stopListening,
  };
}
