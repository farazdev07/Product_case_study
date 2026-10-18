import { StatusBar } from 'react-native';
import { AppServices } from '@app/AppServices';
import { RootNavigator } from '@app/navigation/RootNavigator';
import { AppProviders } from '@app/providers/AppProviders';

function App() {
  return (
    <AppProviders>
      <AppServices />
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </AppProviders>
  );
}

export default App;
