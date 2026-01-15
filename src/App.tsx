import { AuthProvider } from './contexts/AuthContext';
import { WrapDesignerPage } from './editor/WrapDesignerPage';

function App() {
  return (
    <AuthProvider>
      <WrapDesignerPage />
    </AuthProvider>
  );
}

export default App;
