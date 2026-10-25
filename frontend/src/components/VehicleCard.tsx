import type { Session, Vehicle } from '../types';

interface VehicleCardProps {
  vehicle: Vehicle;
  session: Session | null;
  busy: boolean;
  onPurchase: (vehicle: Vehicle) => Promise<void>;
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function VehicleCard({ vehicle, session, busy, onPurchase }: VehicleCardProps) {
  const title = `${vehicle.make} ${vehicle.model}`;
  return (
    <article className="vehicle-card">
      <div className="vehicle-image" role="img" aria-label={`${title} image placeholder`}>🚘</div>
      <div className="vehicle-content">
        <div className="vehicle-heading"><span className="tag">{vehicle.category}</span><span className="quantity">{vehicle.quantity} available</span></div>
        <h3 data-testid="vehicle-name">{title}</h3>
        <p className="price">{currency.format(Number(vehicle.price))}</p>
        {session ? (
          <button className="button button-primary" type="button" disabled={busy || vehicle.quantity < 1} onClick={() => void onPurchase(vehicle)}>
            Purchase {title}
          </button>
        ) : <p className="sign-in-hint">Sign in to purchase this vehicle.</p>}
      </div>
    </article>
  );
}
