import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
// Removed layout import for single-page design
import { ChatWindow } from "@/components/chat-window";
import AllInOnePage from "@/pages/all-in-one";
import Dashboard from "@/pages/dashboard";
import RecommendationsPage from "@/pages/recommendations";
import DocumentsPage from "@/pages/documents";
import { AdminPage } from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AllInOnePage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/recommendations" component={RecommendationsPage} />
      <Route path="/documents" component={DocumentsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
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
