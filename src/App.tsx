import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import ApiStatusBanner from './components/ApiStatusBanner';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

// Visitor
import VisitorHome from './pages/Visitor/Home';
import Venues from './pages/Visitor/Venues';
import Packages from './pages/Visitor/Packages';
import Gallery from './pages/Visitor/Gallery';
import Contact from './pages/Visitor/Contact';
import Inquiry from './pages/Visitor/Inquiry';
import BookingStatus from './pages/Visitor/BookingStatus';

// Office
import OfficeDashboard from './pages/Office/Dashboard';
import NewBooking from './pages/Office/NewBooking';
import Bookings from './pages/Office/Bookings';
import BookingDetail from './pages/Office/BookingDetail';
import Calendar from './pages/Office/Calendar';
import Customers from './pages/Office/Customers';
import Payments from './pages/Office/Payments';
import Receipts from './pages/Office/Receipts';
import UpcomingEvents from './pages/Office/UpcomingEvents';
import EventDayHub from './pages/Office/EventDayHub';
import EventDayReport from './pages/Office/EventDayReport';
import SearchPage from './pages/Office/Search';

// Manager
import ManagerDashboard from './pages/Manager/Dashboard';
import Approvals from './pages/Manager/Approvals';
import Expenses from './pages/Manager/Expenses';
import Reports from './pages/Manager/Reports';

// Admin
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import AdminSettings from './pages/Admin/Settings';
import AuditLogs from './pages/Admin/AuditLogs';

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
        <ApiStatusBanner />
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Public / Visitor */}
          <Route path="/" element={<Layout />}>
            <Route index element={<VisitorHome />} />
            <Route path="venues" element={<Venues />} />
            <Route path="packages" element={<Packages />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="contact" element={<Contact />} />
            <Route path="inquiry" element={<Inquiry />} />
            <Route path="book-now" element={<Inquiry />} />
            <Route path="booking-status" element={<BookingStatus />} />
          </Route>

          {/* Staff dashboards — role-guarded */}
          <Route element={<ProtectedRoute dashboard="office" />}>
            <Route path="/office" element={<DashboardLayout role="office" />}>
              <Route index element={<OfficeDashboard />} />
              <Route path="new-booking" element={<NewBooking />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="bookings/:id" element={<BookingDetail />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="customers" element={<Customers />} />
              <Route path="payments" element={<Payments />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="upcoming" element={<UpcomingEvents />} />
              <Route path="event-day" element={<EventDayHub />} />
              <Route path="event-day/:id" element={<EventDayReport />} />
              <Route path="search" element={<SearchPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute dashboard="manager" />}>
            <Route path="/manager" element={<DashboardLayout role="manager" />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="reports" element={<Reports />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="bookings/:id" element={<BookingDetail />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="customers" element={<Customers />} />
              <Route path="payments" element={<Payments />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute dashboard="admin" />}>
            <Route path="/admin" element={<DashboardLayout role="admin" />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="audit" element={<AuditLogs />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
