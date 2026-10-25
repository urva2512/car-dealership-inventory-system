import { useState, type FormEvent } from 'react';
import type { Vehicle, VehicleInput, VehicleUpdateInput } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';

interface AdminDashboardProps {
  vehicles: Vehicle[];
  busyVehicleId: string | null;
  onCreate: (input: VehicleInput) => Promise<boolean>;
  onUpdate: (vehicle: Vehicle, input: VehicleUpdateInput) => Promise<boolean>;
  onDelete: (vehicle: Vehicle) => Promise<boolean>;
  onRestock: (vehicle: Vehicle, quantity: number) => Promise<boolean>;
}

type DetailsForm = { make: string; model: string; category: string; price: string };
type AddForm = DetailsForm & { quantity: string };

const emptyAddForm: AddForm = { make: '', model: '', category: '', price: '', quantity: '0' };
const detailsFrom = (vehicle: Vehicle): DetailsForm => ({ make: vehicle.make, model: vehicle.model, category: vehicle.category, price: vehicle.price });
const updateInput = (values: DetailsForm): VehicleUpdateInput => ({ ...values, price: Number(values.price) });
const addInput = (values: AddForm): VehicleInput => ({ ...updateInput(values), quantity: Number(values.quantity) });
const titleFor = (vehicle: Vehicle) => `${vehicle.make} ${vehicle.model}`;

function DetailsFields({ values, onChange, prefix }: { values: DetailsForm; onChange: (values: DetailsForm) => void; prefix: string }) {
  return <div className="form-grid">
    <label>{prefix} make<input value={values.make} onChange={(event) => onChange({ ...values, make: event.target.value })} required maxLength={100} /></label>
    <label>{prefix} model<input value={values.model} onChange={(event) => onChange({ ...values, model: event.target.value })} required maxLength={100} /></label>
    <label>{prefix} category<input value={values.category} onChange={(event) => onChange({ ...values, category: event.target.value })} required maxLength={100} /></label>
    <label>{prefix} price<input type="number" min="0" step="0.01" value={values.price} onChange={(event) => onChange({ ...values, price: event.target.value })} required /></label>
  </div>;
}

function VehicleSummary({ vehicle }: { vehicle: Vehicle }) {
  return <div className="vehicle-summary">
    <span className="tag">{vehicle.category}</span>
    <h3>{titleFor(vehicle)}</h3>
    <p>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(vehicle.price))}</p>
    <span className={vehicle.quantity > 0 ? 'stock-badge' : 'stock-badge stock-empty'}>{vehicle.quantity} in stock</span>
  </div>;
}

export function AdminDashboard({ vehicles, busyVehicleId, onCreate, onUpdate, onDelete, onRestock }: AdminDashboardProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [restocking, setRestocking] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const [addValues, setAddValues] = useState<AddForm>(emptyAddForm);
  const [editValues, setEditValues] = useState<DetailsForm>(emptyAddForm);
  const [restockQuantity, setRestockQuantity] = useState('1');
  const [restockError, setRestockError] = useState<string | null>(null);

  async function submitAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onCreate(addInput(addValues))) { setAddValues(emptyAddForm); setAdding(false); }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editing && await onUpdate(editing, updateInput(editValues))) setEditing(null);
  }

  async function submitRestock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(restockQuantity);
    if (!Number.isInteger(quantity) || quantity < 1) { setRestockError('Enter a positive whole number.'); return; }
    if (restocking && await onRestock(restocking, quantity)) { setRestocking(null); setRestockQuantity('1'); setRestockError(null); }
  }

  return <section className="admin-dashboard" aria-labelledby="admin-dashboard-title">
    <div className="section-heading admin-heading">
      <div><p className="eyebrow">Administrator tools</p><h2 id="admin-dashboard-title">Inventory management</h2><p>Manage vehicle details and stock with clearly separated actions.</p></div>
      <button className="button button-primary" type="button" onClick={() => setAdding(true)}>Add vehicle</button>
    </div>
    {vehicles.length === 0 ? <p className="state-message">No vehicles yet. Add your first vehicle to start the inventory.</p> : <div className="admin-vehicle-grid">
      {vehicles.map((vehicle) => <article className="admin-vehicle-card" key={vehicle.id}>
        <VehicleSummary vehicle={vehicle} />
        <div className="admin-card-actions">
          <button className="button button-secondary" type="button" onClick={() => { setEditing(vehicle); setEditValues(detailsFrom(vehicle)); }}>Edit {titleFor(vehicle)}</button>
          <button className="button button-secondary" type="button" onClick={() => { setRestocking(vehicle); setRestockQuantity('1'); setRestockError(null); }}>Restock {titleFor(vehicle)}</button>
          <button className="button button-danger" type="button" onClick={() => setDeleting(vehicle)}>Delete</button>
        </div>
      </article>)}
    </div>}

    {adding && <ConfirmationDialog title="Add vehicle" onClose={() => setAdding(false)}>
      <p className="dialog-copy">Create a vehicle record, including its opening stock.</p>
      <form className="vehicle-form" onSubmit={(event) => void submitAdd(event)}>
        <DetailsFields values={addValues} onChange={(values) => setAddValues({ ...addValues, ...values })} prefix="New vehicle" />
        <label>New vehicle quantity<input type="number" min="0" step="1" value={addValues.quantity} onChange={(event) => setAddValues({ ...addValues, quantity: event.target.value })} required /></label>
        <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={() => setAdding(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={busyVehicleId === 'new'}>Create vehicle</button></div>
      </form>
    </ConfirmationDialog>}

    {editing && <ConfirmationDialog title={`Edit ${titleFor(editing)}`} onClose={() => setEditing(null)}>
      <p className="dialog-copy">Vehicle details can be updated here. Stock can only be changed through restocking or a successful purchase.</p>
      <form className="vehicle-form" onSubmit={(event) => void submitEdit(event)}>
        <DetailsFields values={editValues} onChange={setEditValues} prefix="Edit" />
        <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" type="submit" disabled={busyVehicleId === editing.id}>Save changes</button></div>
      </form>
    </ConfirmationDialog>}

    {restocking && <ConfirmationDialog title={`Restock ${titleFor(restocking)}`} onClose={() => setRestocking(null)}>
      <p className="dialog-copy">Stock changes are applied only after you confirm this restock.</p>
      <p className="stock-details">Current stock: <strong>{restocking.quantity}</strong></p>
      <form className="vehicle-form" onSubmit={(event) => void submitRestock(event)}>
        <label>Quantity to add<input type="number" min="1" step="1" value={restockQuantity} onChange={(event) => { setRestockQuantity(event.target.value); setRestockError(null); }} required /></label>
        <p className="stock-details">New stock after restock: <strong>{restocking.quantity + (Number.isInteger(Number(restockQuantity)) && Number(restockQuantity) > 0 ? Number(restockQuantity) : 0)}</strong></p>
        {restockError && <p className="field-error" role="alert">{restockError}</p>}
        <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={() => setRestocking(null)}>Cancel</button><button className="button button-primary" type="submit" disabled={busyVehicleId === restocking.id}>Restock vehicle</button></div>
      </form>
    </ConfirmationDialog>}

    {deleting && <ConfirmationDialog title="Delete vehicle" onClose={() => setDeleting(null)}>
      <p className="dialog-copy">Delete <strong>{titleFor(deleting)}</strong>? This cannot be undone.</p>
      <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={() => setDeleting(null)}>Cancel</button><button className="button button-danger" type="button" disabled={busyVehicleId === deleting.id} onClick={() => void onDelete(deleting).then((saved) => saved && setDeleting(null))}>Delete vehicle</button></div>
    </ConfirmationDialog>}
  </section>;
}
