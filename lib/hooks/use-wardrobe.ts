"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createWardrobeProduct,
  fetchWardrobe,
  wardrobeQueryKey,
} from "@/lib/api/wardrobe";
import { usageQueryKey } from "@/lib/api/usage";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { CreateWardrobeProductInput } from "@/lib/types/wardrobe";

/** Wardrobe list + create — TanStack Query, gated on auth. */
export function useWardrobeQuery() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();

  const listQuery = useQuery({
    queryKey: wardrobeQueryKey,
    queryFn: fetchWardrobe,
    enabled: hasAuth,
    retry: 1,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateWardrobeProductInput) => createWardrobeProduct(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wardrobeQueryKey }),
        queryClient.invalidateQueries({ queryKey: usageQueryKey }),
      ]);
    },
  });

  return {
    hasAuth,
    ...listQuery,
    products: listQuery.data?.products ?? [],
    createProduct: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    resetCreate: createMutation.reset,
  };
}
