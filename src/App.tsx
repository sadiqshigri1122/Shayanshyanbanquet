import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import ApiStatusBanner from './components/ApiStatusBanner';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

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
import InventoryReports from './pages/Manager/InventoryReports';
import KitchenReports from './pages/Manager/KitchenReports';

// Inventory
import InventoryDashboard from './pages/Inventory/Dashboard';
import AllItems from './pages/Inventory/AllItems';
import AddItem from './pages/Inventory/AddItem';
import BulkAddItems from './pages/Inventory/BulkAddItems';
import StockOut from './pages/Inventory/StockOut';
import StockIn from './pages/Inventory/StockIn';
import InventoryHistory from './pages/Inventory/History';
import KitchenPurchases from './pages/Inventory/KitchenPurchases';
import KitchenPurchaseHistory from './pages/Inventory/KitchenPurchaseHistory';
import KitchenStockPage from './pages/Inventory/KitchenStock';
import KitchenUsageHistory from './pages/Inventory/KitchenUsageHistory';

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
          <Route path="/" element={<Navigate to="/login" replace />} />

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

          <Route element={<ProtectedRoute dashboard="inventory" />}>
            <Route path="/inventory" element={<DashboardLayout role="inventory" />}>
              <Route index element={<InventoryDashboard />} />
              <Route path="items" element={<AllItems />} />
              <Route path="add-item" element={<AddItem />} />
              <Route path="bulk-add" element={<BulkAddItems />} />
              <Route path="stock-out" element={<StockOut />} />
              <Route path="stock-in" element={<StockIn />} />
              <Route path="history" element={<InventoryHistory />} />
              <Route path="kitchen/purchases" element={<KitchenPurchases />} />
              <Route path="kitchen/history" element={<KitchenPurchaseHistory />} />
              <Route path="kitchen/stock" element={<KitchenStockPage />} />
              <Route path="kitchen/usage" element={<KitchenUsageHistory />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute dashboard="manager" />}>
            <Route path="/manager" element={<DashboardLayout role="manager" />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="reports" element={<Reports />} />
              <Route path="inventory-reports" element={<InventoryReports />} />
              <Route path="kitchen-reports" element={<KitchenReports />} />
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

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
