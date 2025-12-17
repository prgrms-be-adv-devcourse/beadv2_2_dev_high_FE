import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { CustomThemeProvider } from "./contexts/ThemeProvider"; // Import CustomThemeProvider
import "./index.css";
import { router } from "./routes";
import { AuthProvider } from "./contexts/AuthContext";
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
