import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { themeColors } from '../theme/colors';

interface LoginScreenProps {
  loading: boolean;
  errorMessage: string | null;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginScreen({ loading, errorMessage, onSubmit }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submitForm = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      return;
    }

    await onSubmit(trimmedEmail, password);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      style={styles.screen}
    >
      <View style={styles.backdropTop} />
      <View style={styles.backdropBottom} />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card} mode="elevated">
          <Card.Content>
          <Text style={styles.kicker}>Click Health Pro</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in with your email and password to continue.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="name@company.com"
              style={[styles.input, loading ? styles.inputDisabled : null]}
              editable={!loading}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="••••••••"
              secureTextEntry
              style={[styles.input, loading ? styles.inputDisabled : null]}
              editable={!loading}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submitForm}
            />
          </View>

          <HelperText type="error" visible={Boolean(errorMessage)} style={styles.errorText}>
            {errorMessage ?? ''}
          </HelperText>

          <Button
            mode="contained"
            disabled={loading}
            loading={loading}
            buttonColor={themeColors.secondary}
            textColor={themeColors.textOnBrand}
            style={styles.button}
            contentStyle={styles.buttonContent}
            onPress={submitForm}
          >
            {loading ? 'Signing in...' : 'Login'}
          </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themeColors.appBackground,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  backdropTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: 'rgba(6, 173, 175, 0.16)',
  },
  backdropBottom: {
    position: 'absolute',
    bottom: -90,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(255, 145, 77, 0.18)',
  },
  card: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  kicker: {
    color: themeColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: themeColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  button: {
    marginTop: 4,
    borderRadius: 16,
  },
  buttonContent: {
    height: 50,
  },
  errorText: {
    marginTop: 0,
    marginBottom: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  helperText: {
    marginTop: 14,
    color: '#8CA0BC',
    fontSize: 12,
    lineHeight: 18,
  },
});