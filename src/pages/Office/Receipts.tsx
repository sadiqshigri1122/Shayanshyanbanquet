import { Navigate } from 'react-router-dom';

/** Redirect legacy route into combined Payments page */
export default function Receipts() {
  return <Navigate to="/office/payments?tab=receipts" replace />;
}
