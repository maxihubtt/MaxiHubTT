import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import About from "@/pages/about";
import Pricing from "@/pages/pricing";
import Fleet from "@/pages/fleet";
import Dashboard from "@/pages/dashboard";
import NewJob from "@/pages/new-job";
import JobDetails from "@/pages/job-details";
import AdminLogin from "@/pages/admin-login";
import DriverJob from "@/pages/driver-job";
import DriverJobs from "@/pages/driver-jobs";
import DriverLogin from "@/pages/driver-login";
import DriverSignup from "@/pages/driver-signup";
import AdminDrivers from "@/pages/admin-drivers";
import AdminConfig from "@/pages/admin-config";
import TermsUsers from "@/pages/terms-users";
import TermsDrivers from "@/pages/terms-drivers";
import NotFound from "@/pages/not-found";

import { AdminGuard } from "@/components/admin-guard";
import { DriverGuard } from "@/components/driver-guard";
import { InstallBanner } from "@/components/install-banner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/fleet" component={Fleet} />

      {/* ADMIN */}
      <Route path="/admin/login" component={AdminLogin} />

      <Route path="/admin">
        <AdminGuard>
          <Dashboard />
        </AdminGuard>
      </Route>

      <Route path="/admin/new-job">
        <AdminGuard>
          <NewJob />
        </AdminGuard>
      </Route>

      <Route path="/admin/drivers">
        <AdminGuard>
          <AdminDrivers />
        </AdminGuard>
      </Route>

      <Route path="/admin/config">
        <AdminGuard>
          <AdminConfig />
        </AdminGuard>
      </Route>

      {/* JOBS */}
      <Route path="/jobs/:id" component={JobDetails} />

      {/* DRIVER */}
      <Route path="/driver/login" component={DriverLogin} />

      <Route path="/driver/signup" component={DriverSignup} />

      <Route path="/terms" component={TermsUsers} />
      <Route path="/driver/terms" component={TermsDrivers} />

      <Route path="/driver/jobs">
        <DriverGuard>
          <DriverJobs />
        </DriverGuard>
      </Route>

      <Route path="/driver/jobs/:id">
        <DriverGuard>
          <DriverJob />
        </DriverGuard>
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function ManifestSwitcher() {
  const [location] = useLocation();
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (!link) return;
    if (location.startsWith("/driver/")) {
      link.href = `${import.meta.env.BASE_URL}driver-manifest.json`;
    } else if (location.startsWith("/admin")) {
      link.href = `${import.meta.env.BASE_URL}admin-manifest.json`;
    } else {
      link.href = `${import.meta.env.BASE_URL}manifest.json`;
    }
  }, [location]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ManifestSwitcher />
          <Router />
        </WouterRouter>

        <InstallBanner />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
