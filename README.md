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