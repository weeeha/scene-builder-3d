import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { ThemeProvider } from "@weeeha/ui/components/theme-provider";
import { Toaster } from "@weeeha/ui/components/sonner";

import { router } from "@/app/router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </StrictMode>
);
