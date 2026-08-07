import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { CenteredLoader } from '../components/CenteredLoader';
import { HomeScreen } from '../screens/HomeScreen';
import { FacilitySelectionScreen } from '../screens/FacilitySelectionScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { useAuth } from '../context/AuthContext';

type AuthStackParamList = {
  Login: undefined;
};

type AppStackParamList = {
  FacilitySelection: undefined;
  Home: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function LoadingScreen() {
  return <CenteredLoader fullScreen message="Loading app..." containerStyle={styles.loadingContainer} />;
}

function AuthStackNavigator() {
  const { signIn, isSigningIn, errorMessage } = useAuth();

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {() => <LoginScreen onSubmit={signIn} loading={isSigningIn} errorMessage={errorMessage} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function AppStackNavigator() {
  const { currentUser, selectFacility, signOut } = useAuth();

  if (!currentUser) {
    return null;
  }

  return (
    <AppStack.Navigator
      key={currentUser.selectedFacility ? 'home' : 'facility'}
      initialRouteName={currentUser.selectedFacility ? 'Home' : 'FacilitySelection'}
      screenOptions={{ headerShown: false }}
    >
      <AppStack.Screen name="FacilitySelection">
        {() => (
          <FacilitySelectionScreen
            facilities={currentUser.associatedFacilities}
            selectedFacilityId={currentUser.selectedFacility?.id ?? null}
            onConfirm={selectFacility}
            onSignOut={signOut}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="Home">
        {() => <HomeScreen user={currentUser} onSignOut={signOut} onSelectFacility={selectFacility} />}
      </AppStack.Screen>
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { currentUser, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer key={currentUser ? 'app' : 'auth'}>
      {currentUser ? <AppStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F2FBFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});