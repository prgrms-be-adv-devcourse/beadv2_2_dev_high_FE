import { router } from "@/app";
import { AuthProvider } from "@moreauction/auth";
import { normalizeRoles, type User } from "@moreauction/types";
import { CustomThemeProvider } from "@moreauction/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { userApi } from "@/apis/userApi";
import "./index.css";

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

const normalizeUser = (nextUser: User) => ({
  ...nextUser,
  roles: normalizeRoles(nextUser.roles),
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
  <CustomThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider onLogoutRequest={userApi.logout} normalizeUser={normalizeUser}>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </CustomThemeProvider>
  //  </React.StrictMode>
);
