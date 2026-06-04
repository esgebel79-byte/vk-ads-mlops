import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/shared/components/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SystemStatusPage } from "@/pages/SystemStatusPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "system", element: <SystemStatusPage /> },
    ],
  },
]);
