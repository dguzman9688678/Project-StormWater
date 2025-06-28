import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Layout } from "@/components/layout/layout";
import { ChatWindow } from "@/components/chat-window";
import Dashboard from "@/pages/dashboard";
import QSDPage from "@/pages/qsd";
import SWPPPPage from "@/pages/swppp";
import ErosionControlPage from "@/pages/erosion-control";
import DocumentsPage from "@/pages/documents";
import AIAnalysisPage from "@/pages/ai-analysis";
import { AdminPage } from "@/pages/admin";
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
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        
        {/* Floating Chat Button */}
        {!isChatOpen && (
          <Button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-40"
            size="sm"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        )}

        {/* Chat Window */}
        <ChatWindow
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onMinimize={() => setIsChatMinimized(!isChatMinimized)}
          isMinimized={isChatMinimized}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
