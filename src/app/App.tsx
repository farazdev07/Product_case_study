import { StatusBar } from 'react-native';
import { RootNavigator } from '@app/navigation/RootNavigator';
import { AppProviders } from '@app/providers/AppProviders';

function App() {
  return (
    <AppProviders>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </AppProviders>
  );
}

export default App;
