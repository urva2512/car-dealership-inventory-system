import { useEffect, useMemo, useState } from 'react';
import { createAdmin, login, register } from './api/auth';
import { ApiError } from './api/client';
import { createVehicle, deleteVehicle, listAdminVehicles, listVehicles, purchaseVehicle, restockVehicle, updateVehicle } from './api/vehicles';
import { AuthForm, type AuthMode } from './components/AuthForm';
import { AdminAccountForm } from './components/AdminAccountForm';
import { AdminDashboard } from './components/AdminDashboard';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { VehicleCard } from './components/VehicleCard';
import { VehicleFilters } from './components/VehicleFilters';
import type { Session, Vehicle, VehicleFilters as Filters, VehicleInput, VehicleSort, VehicleUpdateInput } from './types';
import { sortVehicles } from './utils/vehicleSort';

const sessionKey = 'car-dealership-session';

function readSession(): Session | null {
  try {
    const saved = localStorage.getItem(sessionKey);
    return saved ? JSON.parse(saved) as Session : null;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

function App() {
  const [session, setSession] = useState<Session | null>(readSession);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<VehicleSort>('newest');
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [adminCreationLoading, setAdminCreationLoading] = useState(false);
  const [busyVehicleId, setBusyVehicleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [purchaseCandidate, setPurchaseCandidate] = useState<Vehicle | null>(null);
  const sortedVehicles = useMemo(() => sortVehicles(vehicles, sort), [vehicles, sort]);

  async function loadInventory(nextFilters: Filters = filters) {
    setLoadingInventory(true);
    setError(null);
    try {
      const adminSession = session?.user.role === 'admin' ? session : null;
      setVehicles(adminSession ? await listAdminVehicles(nextFilters, adminSession.token) : await listVehicles(nextFilters));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoadingInventory(false);
    }
  }

  useEffect(() => { void loadInventory({}); }, [session?.user.role]);

  async function handleSearch(nextFilters: Filters) {
    setFilters(nextFilters);
    setSuccess(null);
    await loadInventory(nextFilters);
  }

  async function handleAuth(mode: AuthMode, input: { name?: string; email: string; password: string }) {
    setAuthLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const nextSession = mode === 'register'
        ? await register({ name: input.name ?? '', email: input.email, password: input.password })
        : await login({ email: input.email, password: input.password });
      localStorage.setItem(sessionKey, JSON.stringify(nextSession));
      setSession(nextSession);
      setSuccess(mode === 'register' ? 'Account created successfully! You are now signed in.' : 'Signed in successfully.');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleCreateAdmin(input: { name: string; email: string; password: string }) {
    if (!session) return;
    setAdminCreationLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createAdmin(input, session.token);
      setSuccess('Administrator account created successfully.');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setAdminCreationLoading(false);
    }
  }

  async function handlePurchase(vehicle: Vehicle): Promise<boolean> {
    if (!session) return false;
    setBusyVehicleId(vehicle.id);
    setError(null);
    setSuccess(null);
    try {
      await purchaseVehicle(vehicle.id, session.token);
      await loadInventory(filters);
      setSuccess('Purchase completed.');
      setPurchaseCandidate(null);
      return true;
    } catch (requestError) {
      setError(errorMessage(requestError));
      return false;
    } finally {
      setBusyVehicleId(null);
    }
  }

  async function handleRestock(vehicle: Vehicle, quantity: number): Promise<boolean> {
    if (!session) return false;
    setBusyVehicleId(vehicle.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await restockVehicle(vehicle.id, quantity, session.token);
      setVehicles((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(`${vehicle.make} ${vehicle.model} restocked.`);
      return true;
    } catch (requestError) {
      setError(errorMessage(requestError));
      return false;
    } finally {
      setBusyVehicleId(null);
    }
  }

  async function handleCreateVehicle(input: VehicleInput): Promise<boolean> {
    if (!session) return false;
    setBusyVehicleId('new');
    setError(null);
    setSuccess(null);
    try {
      const created = await createVehicle(input, session.token);
      setVehicles((current) => [created, ...current]);
      setSuccess('Vehicle added successfully.');
      return true;
    } catch (requestError) {
      setError(errorMessage(requestError));
      return false;
    } finally {
      setBusyVehicleId(null);
    }
  }

  async function handleUpdateVehicle(vehicle: Vehicle, input: VehicleUpdateInput): Promise<boolean> {
    if (!session) return false;
    setBusyVehicleId(vehicle.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateVehicle(vehicle.id, input, session.token);
      setVehicles((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(`${updated.make} ${updated.model} updated.`);
      return true;
    } catch (requestError) {
      setError(errorMessage(requestError));
      return false;
    } finally {
      setBusyVehicleId(null);
    }
  }

  async function handleDeleteVehicle(vehicle: Vehicle): Promise<boolean> {
    if (!session) return false;
    setBusyVehicleId(vehicle.id);
    setError(null);
    setSuccess(null);
    try {
      await deleteVehicle(vehicle.id, session.token);
      setVehicles((current) => current.filter((item) => item.id !== vehicle.id));
      setSuccess(`${vehicle.make} ${vehicle.model} deleted.`);
      return true;
    } catch (requestError) {
      setError(errorMessage(requestError));
      return false;
    } finally {
      setBusyVehicleId(null);
    }
  }

  function signOut() {
    localStorage.removeItem(sessionKey);
    setSession(null);
    setSuccess('Signed out.');
  }

  return <main>
    <header className="hero">
      <div><p className="eyebrow">Car dealership</p><h1>Find your next drive.</h1><p className="hero-copy">Browse available vehicles, compare the essentials, and reserve your choice in a few clicks.</p></div>
      {session ? <div className="account-summary"><span>Signed in as {session.user.name}</span><span className="tag">{session.user.role}</span><button className="text-button" onClick={signOut}>Sign out</button></div> : <AuthForm onSubmit={handleAuth} loading={authLoading} />}
    </header>

    <section className="inventory" aria-labelledby="inventory-title">
      <div className="section-heading"><div><p className="eyebrow">Inventory</p><h2 id="inventory-title">{session?.user.role === 'admin' ? 'Vehicle inventory' : 'Available vehicles'}</h2></div><p>{sortedVehicles.length} vehicle{sortedVehicles.length === 1 ? '' : 's'} found</p></div>
      <VehicleFilters onSearch={(nextFilters) => void handleSearch(nextFilters)} sort={sort} onSortChange={setSort} loading={loadingInventory} />
      {session?.user.role === 'admin' && <AdminAccountForm onSubmit={handleCreateAdmin} loading={adminCreationLoading} />}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {success && <div className="notice notice-success" role="status">{success}</div>}
      {loadingInventory ? <p className="state-message" role="status">Loading inventory…</p> : session?.user.role === 'admin' ? <AdminDashboard vehicles={sortedVehicles} busyVehicleId={busyVehicleId} onCreate={handleCreateVehicle} onUpdate={handleUpdateVehicle} onDelete={handleDeleteVehicle} onRestock={handleRestock} /> : sortedVehicles.length > 0 ? <div className="vehicle-grid">{sortedVehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} session={session} busy={busyVehicleId === vehicle.id} onPurchase={(selected) => { setPurchaseCandidate(selected); return Promise.resolve(); }} />)}</div> : !error && <p className="state-message">No available vehicles match your search.</p>}
      {purchaseCandidate && <ConfirmationDialog title="Confirm purchase" onClose={() => !busyVehicleId && setPurchaseCandidate(null)}>
        <p className="dialog-copy">Confirm your purchase of <strong>{purchaseCandidate.make} {purchaseCandidate.model}</strong> for <strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(purchaseCandidate.price))}</strong>.</p>
        <p className="stock-details">Available before purchase: <strong>{purchaseCandidate.quantity}</strong></p>
        <div className="dialog-actions"><button className="button button-secondary" type="button" disabled={busyVehicleId === purchaseCandidate.id} onClick={() => setPurchaseCandidate(null)}>Cancel</button><button className="button button-primary" type="button" disabled={busyVehicleId === purchaseCandidate.id} onClick={() => void handlePurchase(purchaseCandidate)}>Confirm purchase</button></div>
      </ConfirmationDialog>}
    </section>
  </main>;
}

export default App;
