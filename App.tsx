import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MapHomeView } from './src/features/mapHome/views/MapHomeView';

export default function App() {
  return (
    <SafeAreaProvider>
      <MapHomeView />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
