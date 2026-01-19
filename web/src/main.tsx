import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { CustomThemeProvider } from "@/contexts/ThemeProvider"; // Import CustomThemeProvider
import "./index.css";
import { router } from "@/routes";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: false,
      retryOnMount: false,
      refetchOnReconnect: true,
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error: any) => {
        const status =
          error?.response?.status ?? error?.status ?? error?.statusCode;
        if (status === 403 || status === 500) return false;
        return failureCount < 1;
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
  <CustomThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </CustomThemeProvider>
  //  </React.StrictMode>
);
