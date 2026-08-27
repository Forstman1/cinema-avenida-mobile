# Mobile API configuration

The app reads `EXPO_PUBLIC_API_URL` at Expo bundle time. It must contain the
backend base URL including `/api`, and it must not contain credentials.

Examples:

```sh
# Web or iOS simulator
EXPO_PUBLIC_API_URL=http://localhost:3000/api npx expo start --web
EXPO_PUBLIC_API_URL=http://localhost:3000/api npx expo start --ios

# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api npx expo start --android

# Physical Android or iOS device
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api npx expo start --lan
```

For a physical device, replace `192.168.1.10` with the development machine's
LAN IP, keep the device and computer on the same network, and make sure the
backend is listening on a reachable interface and port. The platform defaults
are `localhost` for web/iOS and `10.0.2.2` for Android emulator; set the
environment variable explicitly for physical devices.
