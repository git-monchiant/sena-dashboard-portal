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
  ERDiagramPage,
  MaintenanceOverviewPage,
  ByResponsiblePage,
  MaintenanceAgingPage,
  ContractorPage,
  MaintenanceExceptionPage,
  MaintenanceSettingsPage,
  MaintenanceRequestsPage,
  SalesPerformance2025Page,
  ProjectDetailPage,
  EmployeeListPage,
  EmployeeDetailPage,
  MarketingPerformancePage,
  VPDetailPage,
  PersonDetailPage,
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

            {/* Sales Report 2025 Module */}
            <Route path="sales-2025/performance" element={<SalesPerformance2025Page />} />
            <Route path="sales-2025/marketing" element={<MarketingPerformancePage />} />
            <Route path="sales-2025/project/:projectCode" element={<ProjectDetailPage />} />
            <Route path="sales-2025/employees" element={<EmployeeListPage />} />
            <Route path="sales-2025/employee/:name" element={<EmployeeDetailPage />} />
            <Route path="sales-2025/vp/:name" element={<VPDetailPage />} />
            <Route path="sales-2025/person/:name" element={<PersonDetailPage />} />

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
            <Route path="reports/common-fee/er-diagram" element={<ERDiagramPage />} />
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
