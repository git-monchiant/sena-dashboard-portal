import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@shared/auth';
import { Layout, MainDashboardPage, CatalogPage } from '@portal/index';
import {
  SalesOverviewPage,
  SalesPipelinePage,
  TransferOverviewPage,
  TransferAgingPage,
} from '@/reports';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Main Navigation */}
            <Route index element={<MainDashboardPage />} />
            <Route path="reports" element={<CatalogPage />} />

            {/* Sales Module */}
            <Route path="sales" element={<SalesOverviewPage />} />
            <Route path="sales/pipeline" element={<SalesPipelinePage />} />
            <Route path="sales/channel" element={<SalesOverviewPage />} />
            <Route path="sales/leads" element={<SalesOverviewPage />} />

            {/* Transfer Module */}
            <Route path="transfer" element={<TransferOverviewPage />} />
            <Route path="transfer/aging" element={<TransferAgingPage />} />
            <Route path="transfer/status" element={<TransferOverviewPage />} />
            <Route path="transfer/documents" element={<TransferOverviewPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
