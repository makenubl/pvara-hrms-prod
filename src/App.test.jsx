import { render, screen } from '@testing-library/react';
import App from './App.jsx';

test('renders app shell', () => {
  render(<App />);
  // Lazy routes render the Suspense fallback immediately
  expect(screen.getByText(/loading\.{3}/i)).toBeInTheDocument();
});
