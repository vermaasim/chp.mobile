# Click Health Pro Mobile

Expo React Native app in TypeScript with an email/password login flow backed by `axios`.
The app uses protected navigation stacks so authenticated users go straight to the home screen after restart.

## Run locally

1. Install dependencies.

```bash
npm install
```

2. Start the development server.

```bash
npm run start
```

3. Run on iOS.

```bash
npm run ios
```

4. Run on Android.

```bash
npm run android
```

## Debug in VS Code

1. Install the recommended extension when prompted: `Expo Tools`.
2. Open the Run and Debug view.
3. Choose one of:
	- `Expo: Start Metro`
	- `Expo: Run Android`
	- `Expo: Run iOS`
	- `Web: Launch Chrome`
4. Start debugging with `F5`.

For native JS breakpoints (Android/iOS), run the command palette action `Expo: Debug ...` after your app is connected.

## Voice dictation (speech-to-text)

The app now supports microphone dictation for multiline text fields.

- Uses `expo-speech-recognition` for speech-to-text.
- `expo-speech` is text-to-speech only and is not used for dictation.
- This feature depends on native code and permissions configured in `app.json`.

If you add or change native plugins, rebuild your app before testing dictation:

```bash
npx expo prebuild
npm run ios
# or
npm run android
```

Note: Dictation behavior can vary by device speech services (especially Android vendor builds).

## API configuration

The app calls `https://localhost:5015/api/account/login` using `axios`.

If you test on a physical device, make sure the API certificate is trusted and the device can reach the host.

After a successful login, the app stores the returned session locally and restores it on the next launch.

## Production builds

Expo production builds use EAS.

1. Install EAS CLI.

```bash
npm install -g eas-cli
```

2. Log in to Expo.

```bash
eas login
```

3. Configure the project for builds.

```bash
eas build:configure
```

4. Create an Android production build.

```bash
eas build --platform android --profile production
```

5. Create an iOS production build.

```bash
eas build --platform ios --profile production
```

If you want both platforms at once, run `eas build --platform all --profile production`.