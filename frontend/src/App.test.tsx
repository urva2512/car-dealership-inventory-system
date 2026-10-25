import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createAdmin, register } from './api/auth';
import { ApiError } from './api/client';
import { createVehicle, listAdminVehicles, listVehicles, purchaseVehicle, restockVehicle, updateVehicle } from './api/vehicles';

vi.mock('./api/vehicles', () => ({
  listVehicles: vi.fn(),
  listAdminVehicles: vi.fn(),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
  purchaseVehicle: vi.fn(),
  restockVehicle: vi.fn(),
}));

vi.mock('./api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  createAdmin: vi.fn(),
}));

const mockedListVehicles = vi.mocked(listVehicles);
const mockedPurchaseVehicle = vi.mocked(purchaseVehicle);
const mockedListAdminVehicles = vi.mocked(listAdminVehicles);
const mockedCreateVehicle = vi.mocked(createVehicle);
const mockedUpdateVehicle = vi.mocked(updateVehicle);
const mockedRestockVehicle = vi.mocked(restockVehicle);
const mockedRegister = vi.mocked(register);
const mockedCreateAdmin = vi.mocked(createAdmin);

const vehicle = {
  id: '101',
  make: 'Toyota',
  model: 'Camry',
  category: 'Sedan',
  price: '25000.00',
  quantity: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  mockedListVehicles.mockReset();
  mockedPurchaseVehicle.mockReset();
  mockedListAdminVehicles.mockReset();
  mockedListAdminVehicles.mockResolvedValue([]);
  mockedCreateVehicle.mockReset();
  mockedUpdateVehicle.mockReset();
  mockedRestockVehicle.mockReset();
  mockedRegister.mockReset();
  mockedCreateAdmin.mockReset();
});

describe('inventory application', () => {
  it('shows a clear backend-unavailable error', async () => {
    mockedListVehicles.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the backend.'));

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the backend.');
  });

  it('sends entered filters to the real inventory query layer', async () => {
    mockedListVehicles.mockResolvedValue([vehicle]);
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText('Toyota Camry');
    await user.type(screen.getByLabelText('Make'), 'Toyota');
    await user.click(screen.getByRole('button', { name: 'Search inventory' }));

    await waitFor(() => expect(mockedListVehicles).toHaveBeenLastCalledWith({ make: 'Toyota' }));
  });

  it('requires confirmation before using the stored JWT to purchase a vehicle', async () => {
    localStorage.setItem('car-dealership-session', JSON.stringify({
      token: 'test-token',
      user: { id: '1', name: 'Buyer', email: 'buyer@example.com', role: 'user', createdAt: '2026-01-01T00:00:00.000Z' },
    }));
    mockedListVehicles.mockResolvedValue([vehicle]);
    mockedPurchaseVehicle.mockResolvedValue({ ...vehicle, quantity: 1 });
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText('Toyota Camry');
    await user.click(screen.getByRole('button', { name: 'Purchase Toyota Camry' }));

    expect(mockedPurchaseVehicle).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog', { name: 'Confirm purchase' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Confirm purchase' }));
    await waitFor(() => expect(mockedPurchaseVehicle).toHaveBeenCalledWith('101', 'test-token'));
    expect(await screen.findByText('Purchase completed.')).toBeTruthy();
  });

  it('registers, persists the returned session, and shows an immediate success message', async () => {
    mockedListVehicles.mockResolvedValue([vehicle]);
    mockedRegister.mockResolvedValue({
      token: 'new-session-token',
      user: { id: '2', name: 'New User', email: 'new@example.com', role: 'user', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText('Toyota Camry');
    await user.click(screen.getByRole('button', { name: 'Need an account? Register' }));
    await user.type(screen.getByLabelText('Name'), 'New User');
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'secure-password-123');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith({ name: 'New User', email: 'new@example.com', password: 'secure-password-123' }));
    expect(await screen.findByText('Account created successfully! You are now signed in.')).toBeTruthy();
    expect(screen.getByText('Signed in as New User')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('car-dealership-session') ?? '{}')).toMatchObject({ token: 'new-session-token' });
  });

  it('shows the registration API error and does not sign in when registration fails', async () => {
    mockedListVehicles.mockResolvedValue([vehicle]);
    mockedRegister.mockRejectedValue(new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists.'));
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText('Toyota Camry');
    await user.click(screen.getByRole('button', { name: 'Need an account? Register' }));
    await user.type(screen.getByLabelText('Name'), 'Duplicate User');
    await user.type(screen.getByLabelText('Email'), 'duplicate@example.com');
    await user.type(screen.getByLabelText('Password'), 'secure-password-123');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.');
    expect(localStorage.getItem('car-dealership-session')).toBeNull();
    expect(screen.queryByText('Account created successfully! You are now signed in.')).toBeNull();
  });

  it('shows an admin-only form that creates an admin account with the current token', async () => {
    localStorage.setItem('car-dealership-session', JSON.stringify({
      token: 'admin-token',
      user: { id: '3', name: 'Admin', email: 'admin@example.com', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z' },
    }));
    mockedListVehicles.mockResolvedValue([vehicle]);
    mockedCreateAdmin.mockResolvedValue({ id: '4', name: 'New Admin', email: 'new-admin@example.com', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z' });
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: 'Create administrator' });
    await user.type(screen.getByLabelText('Administrator name'), 'New Admin');
    await user.type(screen.getByLabelText('Administrator email'), 'new-admin@example.com');
    await user.type(screen.getByLabelText('Administrator password'), 'secure-password-123');
    await user.click(screen.getByRole('button', { name: 'Create administrator' }));

    await waitFor(() => expect(mockedCreateAdmin).toHaveBeenCalledWith(
      { name: 'New Admin', email: 'new-admin@example.com', password: 'secure-password-123' },
      'admin-token',
    ));
    expect(await screen.findByText('Administrator account created successfully.')).toBeTruthy();
  });

  it('loads the complete inventory and lets an admin add a vehicle', async () => {
    localStorage.setItem('car-dealership-session', JSON.stringify({
      token: 'admin-token',
      user: { id: '3', name: 'Admin', email: 'admin@example.com', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z' },
    }));
    const outOfStockVehicle = { ...vehicle, id: '102', model: 'Out of Stock', quantity: 0 };
    mockedListAdminVehicles.mockResolvedValue([outOfStockVehicle]);
    mockedCreateVehicle.mockResolvedValue({ ...vehicle, id: '103', model: 'New Vehicle' });
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: 'Inventory management' });
    expect(await screen.findByRole('heading', { name: 'Toyota Out of Stock' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Add vehicle' }));
    await user.type(screen.getByLabelText('New vehicle make'), 'Ford');
    await user.type(screen.getByLabelText('New vehicle model'), 'Bronco');
    await user.type(screen.getByLabelText('New vehicle category'), 'SUV');
    await user.type(screen.getByLabelText('New vehicle price'), '45000');
    await user.type(screen.getByLabelText('New vehicle quantity'), '2');
    await user.click(screen.getByRole('button', { name: 'Create vehicle' }));

    await waitFor(() => expect(mockedCreateVehicle).toHaveBeenCalledWith(
      { make: 'Ford', model: 'Bronco', category: 'SUV', price: 45000, quantity: 2 },
      'admin-token',
    ));
  });

  it('edits vehicle details without sending or replacing stock quantity', async () => {
    localStorage.setItem('car-dealership-session', JSON.stringify({
      token: 'admin-token',
      user: { id: '3', name: 'Admin', email: 'admin@example.com', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z' },
    }));
    mockedListAdminVehicles.mockResolvedValue([vehicle]);
    mockedUpdateVehicle.mockResolvedValue({ ...vehicle, model: 'Camry Hybrid', quantity: 2 });
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: 'Inventory management' });
    await user.click(screen.getByRole('button', { name: 'Edit Toyota Camry' }));
    const modelInput = screen.getByLabelText('Edit model');
    await user.clear(modelInput);
    await user.type(modelInput, 'Camry Hybrid');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockedUpdateVehicle).toHaveBeenCalledWith(
      '101',
      { make: 'Toyota', model: 'Camry Hybrid', category: 'Sedan', price: 25000 },
      'admin-token',
    ));
  });

  it('shows a dedicated restock confirmation and adds the entered quantity', async () => {
    localStorage.setItem('car-dealership-session', JSON.stringify({
      token: 'admin-token',
      user: { id: '3', name: 'Admin', email: 'admin@example.com', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z' },
    }));
    mockedListAdminVehicles.mockResolvedValue([vehicle]);
    mockedRestockVehicle.mockResolvedValue({ ...vehicle, quantity: 5 });
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: 'Inventory management' });
    await user.click(screen.getByRole('button', { name: 'Restock Toyota Camry' }));
    expect(await screen.findByText(/Current stock:/)).toBeTruthy();
    const quantityInput = screen.getByLabelText('Quantity to add');
    await user.clear(quantityInput);
    await user.type(quantityInput, '3');
    expect(screen.getByText(/New stock after restock:/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Restock vehicle' }));

    await waitFor(() => expect(mockedRestockVehicle).toHaveBeenCalledWith('101', 3, 'admin-token'));
  });

  it('sorts the visible inventory by the selected price order', async () => {
    mockedListVehicles.mockResolvedValue([
      { ...vehicle, id: '201', make: 'Volvo', model: 'XC40', price: '40000.00' },
      { ...vehicle, id: '202', make: 'Audi', model: 'A3', price: '20000.00' },
    ]);
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText('Volvo XC40');
    await user.selectOptions(screen.getByLabelText('Sort inventory'), 'price-asc');

    expect(screen.getAllByTestId('vehicle-name').map((element) => element.textContent)).toEqual(['Audi A3', 'Volvo XC40']);
  });
});
