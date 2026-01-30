import { Routes, Route } from "react-router-dom";
import LandingPage from "./app/page";
import DashboardPage from "./app/dashboard/page";
import AdminPage from "./app/admin/page";
import AboutPage from "./app/about/page";
import ApiDocsPage from "./app/api-docs/page";
import BlogPage from "./app/blog/page";
import CareersPage from "./app/careers/page";
import ContactPage from "./app/contact/page";
import LegalPage from "./app/legal/page";
import PrivacyPage from "./app/privacy/page";
import RiskDisclosurePage from "./app/risk-disclosure/page";
import TermsPage from "./app/terms/page";
import NotFoundPage from "./pages/NotFoundPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/api-docs" element={<ApiDocsPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/risk-disclosure" element={<RiskDisclosurePage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
