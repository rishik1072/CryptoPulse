import { supabase } from '@/lib/supabase'
import type { PostgrestError } from '@supabase/supabase-js'

export interface RepositoryError extends Error {
  code?: string
  details?: string
  hint?: string
}

export function handleError(error: PostgrestError | Error | null, operation: string): RepositoryError {
  if (!error) {
    return new Error(`Unknown error during ${operation}`) as RepositoryError
  }
  
  const repoError = new Error(error.message) as RepositoryError
  if ('code' in error) {
    repoError.code = error.code
    repoError.details = error.details
    repoError.hint = error.hint
  }
  return repoError
}

export async function withErrorHandling<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  operationName: string
): Promise<T> {
  const { data, error } = await operation()
  if (error) {
    throw handleError(error, operationName)
  }
  if (data === null) {
    throw new Error(`No data returned from ${operationName}`)
  }
  return data
}

export async function withErrorHandlingOptional<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  operationName: string
): Promise<T | null> {
  const { data, error } = await operation()
  if (error) {
    throw handleError(error, operationName)
  }
  return data
}

export function createQueryBuilder<T extends Record<string, unknown>>(
  table: string,
  selectFields: string = '*'
) {
  return {
    select: (fields?: string) => supabase.from(table).select(fields || selectFields),
    insert: (data: T | T[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return supabase.from(table).insert(data as any)
    },
    update: (data: Partial<T>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return supabase.from(table).update(data as any)
    },
    upsert: (data: T | T[], options?: { onConflict?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return supabase.from(table).upsert(data as any, options)
    },
    delete: () => supabase.from(table).delete(),
  }
}
