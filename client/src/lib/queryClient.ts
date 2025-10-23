import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiRequest } from "./api";

// Re-export the apiRequest function for backward compatibility
export { apiRequest };

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      return await apiRequest<T>({
        method: 'GET',
        route: queryKey.join("/") as string,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('401') && unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
