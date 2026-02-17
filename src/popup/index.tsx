import { createRoot } from 'react-dom/client';
import { Popup } from './components/Popup';

const container = document.getElementById('popup');
if (!container) {
  throw new Error('Popup root element not found');
}
const root = createRoot(container);
root.render(<Popup />);
