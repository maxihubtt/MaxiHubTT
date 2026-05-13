import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import NewJob from "@/pages/new-job";
import JobDetails from "@/pages/job-details";
import AdminLogin from "@/pages/admin-login";
import DriverJob from "@/pages/driver-job";
import NotFound from "@/pages/not-found";
import { AdminGuard } from "@/components/admin-guard";

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
      <Route path="/jobs/:id" component={JobDetails} />
      <Route path="/driver/jobs/:id" component={DriverJob} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
