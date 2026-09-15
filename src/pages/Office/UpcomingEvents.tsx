import { Navigate } from 'react-router-dom';

/** Redirect legacy route into Event Day hub */
export default function UpcomingEvents() {
  return <Navigate to="/office/event-day?tab=upcoming" replace />;
}
