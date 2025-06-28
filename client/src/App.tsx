import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import QSDPage from "@/pages/qsd";
import SWPPPPage from "@/pages/swppp";
import ErosionControlPage from "@/pages/erosion-control";
import DocumentsPage from "@/pages/documents";
import AIAnalysisPage from "@/pages/ai-analysis";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/qsd" component={QSDPage} />
        <Route path="/swppp" component={SWPPPPage} />
        <Route path="/erosion-control" component={ErosionControlPage} />
        <Route path="/documents" component={DocumentsPage} />
        <Route path="/ai-analysis" component={AIAnalysisPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
