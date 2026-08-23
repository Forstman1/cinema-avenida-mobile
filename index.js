import { Buffer } from 'buffer';
import { registerRootComponent } from 'expo';

import App from './App';

// Polyfill Node's Buffer for libraries that depend on it in React Native runtime.
global.Buffer = Buffer;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
