import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { CustomThemeProvider } from "@/contexts/ThemeProviderx"; // Import CustomThemeProvider
import "./index.css";
import { router } from "@/routes/indexx";
import { AuthProvider } from "@/contexts/AuthContextx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
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
