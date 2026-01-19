import { AuthProvider } from "@moreauction/auth";
import { normalizeRoles, type User } from "@moreauction/types";
import { CustomThemeProvider } from "@moreauction/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { userApi } from "@/apis/userApi";
import { router } from "./app/routes";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
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
