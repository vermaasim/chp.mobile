import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadMyFacilities, login, setAuthToken } from '../api/auth';
import { setAttendanceAuthToken } from '../api/attendance';
import { warmUpDeviceKeyPair } from '../storage/deviceKeys';
import { clearSession, loadSession, saveSession } from '../storage/session';
import type { AuthSession, Facility } from '../types/auth';
import { buildMobileLoginDeviceInfoWithKeyLookup } from '../utils/deviceInfo';

interface AuthContextValue {
  currentUser: AuthSession | null;
  isBootstrapping: boolean;
  isSigningIn: boolean;
  errorMessage: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  selectFacility: (facilityId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeSession(user: AuthSession, facilities: Facility[]) {
  const selectedFacility =
    user.selectedFacility && facilities.some((facility) => facility.id === user.selectedFacility?.id)
      ? user.selectedFacility
      : facilities.length === 1
      ? facilities[0]
      : null;

  return {
    ...user,
    associatedFacilities: facilities,
    selectedFacility,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    warmUpDeviceKeyPair();

    let isMounted = true;

    const bootstrapSession = async () => {
      try {
        const savedUser = await loadSession();

        if (!isMounted || !savedUser) {
          return;
        }

        setAuthToken(savedUser.token);
        setAttendanceAuthToken(savedUser.token);

        const savedFacilities = Array.isArray(savedUser.associatedFacilities)
          ? savedUser.associatedFacilities
          : [];

        const facilities =
          savedFacilities.length > 0 ? savedFacilities : await loadMyFacilities();

        const hydratedUser = normalizeSession(savedUser, facilities);
        await saveSession(hydratedUser);
        setCurrentUser(hydratedUser);
      } catch {
        await clearSession();
        setAuthToken(null);
        setAttendanceAuthToken(null);
        setCurrentUser(null);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsSigningIn(true);
    setErrorMessage(null);

    try {
      const deviceInfo = await buildMobileLoginDeviceInfoWithKeyLookup();
      const authenticatedUser = await login({
        userName: email,
        password,
        deviceInfo,
      });

      setAuthToken(authenticatedUser.token);
      setAttendanceAuthToken(authenticatedUser.token);
      const associatedFacilities = await loadMyFacilities();

      if (associatedFacilities.length === 0) {
        throw new Error('No facilities are associated with this user.');
      }

      const authenticatedSession: AuthSession = {
        ...authenticatedUser,
        associatedFacilities,
        selectedFacility: associatedFacilities.length === 1 ? associatedFacilities[0] : null,
      };

      await saveSession(authenticatedSession);
      setCurrentUser(authenticatedSession);
    } catch (error) {
      //alert(error); // Display an alert for login failure
      await clearSession();
      setAuthToken(null);
      setAttendanceAuthToken(null);
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const selectFacility = async (facilityId: string) => {
    setErrorMessage(null);

    setCurrentUser((previousUser) => {
      if (!previousUser) {
        return previousUser;
      }

      const nextSelectedFacility = previousUser.associatedFacilities.find((facility) => facility.id === facilityId);

      if (!nextSelectedFacility) {
        return previousUser;
      }

      const nextUser: AuthSession = {
        ...previousUser,
        selectedFacility: nextSelectedFacility,
      };

      void saveSession(nextUser);
      return nextUser;
    });
  };

  const signOut = async () => {
    await clearSession();
    setAuthToken(null);
    setAttendanceAuthToken(null);
    setCurrentUser(null);
    setErrorMessage(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isBootstrapping,
        isSigningIn,
        errorMessage,
        signIn,
        selectFacility,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}