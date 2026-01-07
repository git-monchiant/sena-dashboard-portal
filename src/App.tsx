import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@shared/auth';
import { Layout, MainDashboardPage, CatalogPage } from '@portal/index';
import {
  SalesOverviewPage,
  SalesPipelinePage,
  TransferOverviewPage,
  TransferAgingPage,
  CommonFeeOverviewPage,
  CollectionDetailPage,
  AgingReportPage,
  ExceptionPage,
  CommonFeeSettingsPage,
  MaintenanceOverviewPage,
  ByResponsiblePage,
  MaintenanceAgingPage,
  ContractorPage,
  MaintenanceExceptionPage,
  MaintenanceSettingsPage,
  MaintenanceRequestsPage,
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

            {/* Common Fee Module */}
            <Route path="reports/common-fee" element={<CommonFeeOverviewPage />} />
            <Route path="reports/common-fee/collection" element={<CollectionDetailPage />} />
            <Route path="reports/common-fee/aging" element={<AgingReportPage />} />
            <Route path="reports/common-fee/exception" element={<ExceptionPage />} />
            <Route path="reports/common-fee/settings" element={<CommonFeeSettingsPage />} />

            {/* Maintenance Module */}
            <Route path="maintenance" element={<MaintenanceOverviewPage />} />
            <Route path="maintenance/requests" element={<MaintenanceRequestsPage />} />
            <Route path="maintenance/by-responsible" element={<ByResponsiblePage />} />
            <Route path="maintenance/aging" element={<MaintenanceAgingPage />} />
            <Route path="maintenance/contractor" element={<ContractorPage />} />
            <Route path="maintenance/exception" element={<MaintenanceExceptionPage />} />
            <Route path="maintenance/settings" element={<MaintenanceSettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
