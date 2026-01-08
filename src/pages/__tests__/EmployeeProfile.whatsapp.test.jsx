import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeeProfile from '../EmployeeProfile.jsx';

vi.mock('../../layouts/MainLayout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    user: { role: 'employee', employeeId: 'EMP-001', status: 'active' },
    setUser: vi.fn(),
  }),
}));

const apiGet = vi.fn();
const apiPut = vi.fn();

vi.mock('../../services/api', () => ({
  default: {
    get: (...args) => apiGet(...args),
    put: (...args) => apiPut(...args),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EmployeeProfile WhatsApp settings', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPut.mockReset();
  });

  test('loads, allows editing WhatsApp number and preferences, and saves via /profile', async () => {
    apiGet.mockResolvedValue({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+923001111111',
        whatsappNumber: '+923009999999',
        whatsappPreferences: {
          enabled: true,
          taskAssigned: true,
          taskUpdates: true,
          reminders: true,
        },
        documents: [],
        profileImage: null,
        reportsTo: null,
      },
    });

    apiPut.mockResolvedValueOnce({
      data: {
        message: 'Profile updated successfully',
        user: { _id: 'u1' },
      },
    });

    const user = userEvent.setup();
    render(<EmployeeProfile />);

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/profile'));

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const waInput = screen.getByPlaceholderText('+923001234567');
    await user.clear(waInput);
    await user.type(waInput, '+14583092310');

    // Toggle Task updates off
    const taskUpdatesToggle = screen.getByLabelText(/task updates/i);
    await user.click(taskUpdatesToggle);

    // Keep Enabled on; toggle Reminders off
    const remindersToggle = screen.getByLabelText(/deadline reminders/i);
    await user.click(remindersToggle);

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(apiPut).toHaveBeenCalledTimes(1);
    });

    const [, payload] = apiPut.mock.calls[0];
    expect(payload.whatsappNumber).toBe('+14583092310');
    expect(payload.whatsappPreferences).toEqual(
      expect.objectContaining({
        enabled: true,
        taskAssigned: true,
        taskUpdates: false,
        reminders: false,
      })
    );
  });
});
