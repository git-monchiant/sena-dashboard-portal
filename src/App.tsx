import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@shared/auth';
import { Layout, CatalogPage } from '@portal/index';
import {
  SalesOverviewPage,
  SalesPipelinePage,
  TransferOverviewPage,
  TransferAgingPage,
  ProjectOverviewPage,
  AgingReportPage,
  CommonFeeSettingsPage,
  ProjectCollectionPage,
  QualityOverviewPage,
  QualityAgingPage,
  QualityRequestsPage,
  QualitySettingsPage,
  ProjectOverviewQualityPage,
  CategoryByProjectPage,
  SalesPerformance2025Page,
  ProjectDetailPage,
  EmployeeListPage,
  EmployeeDetailPage,
  MarketingPerformancePage,
  PersonDetailPage,
  ExcelImportPage,
  MenuSettingsPage,
} from '@/reports';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Main Navigation - Default to Common Fee */}
            <Route index element={<Navigate to="/reports/common-fee" replace />} />
            <Route path="reports" element={<CatalogPage />} />

            {/* Sales Report 2025 Module */}
            <Route path="sales-2025/performance" element={<SalesPerformance2025Page />} />
            <Route path="sales-2025/marketing" element={<MarketingPerformancePage />} />
            <Route path="sales-2025/project/:projectCode" element={<ProjectDetailPage />} />
            <Route path="sales-2025/employees" element={<EmployeeListPage />} />
            <Route path="sales-2025/employee/:name" element={<EmployeeDetailPage />} />
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
            <Route path="reports/common-fee" element={<ProjectCollectionPage />} />
            <Route path="reports/common-fee/projects" element={<ProjectCollectionPage />} />
            <Route path="reports/common-fee/overview" element={<ProjectOverviewPage />} />
            <Route path="reports/common-fee/aging" element={<AgingReportPage />} />
            <Route path="reports/common-fee/settings" element={<CommonFeeSettingsPage />} />

            {/* Quality Report Module */}
            <Route path="quality" element={<QualityOverviewPage />} />
            <Route path="quality/requests" element={<QualityRequestsPage />} />
            <Route path="quality/aging" element={<QualityAgingPage />} />
            <Route path="quality/settings" element={<QualitySettingsPage />} />
            <Route path="quality/project-overview" element={<ProjectOverviewQualityPage />} />
            <Route path="quality/category-by-project" element={<CategoryByProjectPage />} />

            {/* Data Tools Module */}
            <Route path="data-tools/excel-import" element={<ExcelImportPage />} />
            <Route path="data-tools/menu-settings" element={<MenuSettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
