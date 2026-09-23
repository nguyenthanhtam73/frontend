"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createWardrobeProduct,
  deleteWardrobeProduct,
  ensureWardrobeProductInsight,
  fetchWardrobe,
  updateWardrobeProduct,
  wardrobeQueryKey,
} from "@/lib/api/wardrobe";
import { usageQueryKey } from "@/lib/api/usage";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";
import type {
  CreateWardrobeProductInput,
  UpdateWardrobeProductInput,
  WardrobeListDTO,
} from "@/lib/types/wardrobe";

async function invalidateWardrobeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: wardrobeQueryKey }),
    queryClient.invalidateQueries({ queryKey: usageQueryKey }),
  ]);
}

/** Wardrobe list + create/update/delete — TanStack Query, gated on auth. */
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
      await invalidateWardrobeQueries(queryClient);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWardrobeProductInput }) =>
      updateWardrobeProduct(id, input),
    onSuccess: async () => {
      await invalidateWardrobeQueries(queryClient);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWardrobeProduct(id),
    onSuccess: async () => {
      await invalidateWardrobeQueries(queryClient);
    },
  });

  const ensureInsight = useCallback(
    async (id: string, input: { locale: string; force?: boolean }) => {
      const product = await ensureWardrobeProductInsight(id, input);
      queryClient.setQueryData<WardrobeListDTO | undefined>(wardrobeQueryKey, (old) => {
        if (!old) return old;
        let found = false;
        const products = old.products.map((row) => {
          if (row.id !== product.id) return row;
          found = true;
          return product;
        });
        return { products: found ? products : [product, ...old.products] };
      });
      return product;
    },
    [queryClient],
  );

  return {
    hasAuth,
    ...listQuery,
    products: listQuery.data?.products ?? [],
    createProduct: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    resetCreate: createMutation.reset,
    updateProduct: (id: string, input: UpdateWardrobeProductInput) =>
      updateMutation.mutateAsync({ id, input }),
    isUpdating: updateMutation.isPending,
    deleteProduct: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    ensureInsight,
  };
}
