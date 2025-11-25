/**
 * Combines multiple async iterators into a single async iterator
 * Uses Promise.race to yield values as they arrive from any iterator
 * 
 * @template T - The type of values yielded by the iterators
 * @param iterators - Array of async iterators to combine
 * @returns An async generator that yields values from all iterators as they arrive
 * 
 * @example
 * ```typescript
 * const iter1 = async function* () { yield 1; yield 2; }();
 * const iter2 = async function* () { yield 3; yield 4; }();
 * 
 * for await (const value of combineAsyncIterators([iter1, iter2])) {
 *   console.log(value); // Logs 1, 3, 2, 4 (order depends on timing)
 * }
 * ```
 */
export async function* combineAsyncIterators<T>(
  iterators: AsyncIterableIterator<T>[]
): AsyncGenerator<T, unknown[], unknown> {
  const asyncIterators = iterators.map(iter => iter[Symbol.asyncIterator]());
  const results: unknown[] = [];
  let count = asyncIterators.length;
  
  // Sentinel promise that never resolves, used to mark completed iterators
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const never = new Promise<never>(() => {});
  
  /**
   * Wraps iterator.next() to include the iterator's index
   * This allows us to track which iterator produced each result
   */
  function getNext(
    asyncIterator: AsyncIterator<T>,
    index: number
  ): Promise<{ index: number; result: IteratorResult<T> }> {
    return asyncIterator.next().then(result => ({
      index,
      result,
    }));
  }
  
  // Initialize promises array with first next() call for each iterator
  const nextPromises: (
    | Promise<{ index: number; result: IteratorResult<T> }>
    | Promise<never>
  )[] = asyncIterators.map(getNext);
  
  try {
    // Continue until all iterators are done
    while (count > 0) {
      // Race all pending next() calls to get the first available value
      const { index, result } = (await Promise.race(nextPromises)) as {
        index: number;
        result: IteratorResult<T>;
      };
      
      if (result.done) {
        // Iterator is done, mark it with the never promise
        nextPromises[index] = never;
        results[index] = result.value;
        count--;
      } else {
        // Iterator has a value, queue its next() call and yield the value
        const iterator = asyncIterators[index];
        if (iterator) {
          nextPromises[index] = getNext(iterator, index);
        }
        yield result.value;
      }
    }
  } finally {
    // Clean up: call return() on any iterators that weren't completed
    for (const [index, iterator] of asyncIterators.entries()) {
      if (nextPromises[index] !== never && iterator.return != null) {
        void iterator.return();
      }
    }
  }
  
  // Return all final values from completed iterators
  return results;
}

/**
 * Type guard to check if a value is an async iterable
 */
export function isAsyncIterable<T = unknown>(
  value: unknown
): value is AsyncIterable<T> {
  return (
    value != null &&
    typeof value === 'object' &&
    Symbol.asyncIterator in value &&
    typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === 'function'
  );
}

/**
 * Merges multiple async iterators into a single async iterator that yields arrays
 * Uses Promise.all to wait for all iterators to produce their next value simultaneously
 * 
 * @template T - The type of values yielded by the iterators
 * @param iterators - Array of async iterators to merge
 * @returns An async generator that yields arrays containing values from all iterators
 * 
 * @example
 * ```typescript
 * const iter1 = async function* () { yield 1; yield 2; }();
 * const iter2 = async function* () { yield 10; yield 20; }();
 * 
 * for await (const values of mergeAsyncIterators([iter1, iter2])) {
 *   console.log(values); // Logs [1, 10], then [2, 20]
 * }
 * ```
 */
export async function* mergeAsyncIterators<T>(
  iterators: AsyncIterableIterator<T>[]
): AsyncGenerator<T[], void, unknown> {
  if (iterators.length === 0) {
    return;
  }

  const asyncIterators = iterators.map(iter => iter[Symbol.asyncIterator]());
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      // Get next value from all iterators simultaneously
      const results = await Promise.all(
        asyncIterators.map(iterator => iterator.next())
      );
      
      // Check if all iterators are done
      if (results.every(result => result.done)) {
        break;
      }
      
      // Check if any iterator is done (they should all finish at the same time ideally)
      const anyDone = results.some(result => result.done);
      if (anyDone) {
        // If only some are done, we could either:
        // 1. Stop when the first one finishes (current behavior)
        // 2. Continue with undefined for finished iterators
        // 3. Throw an error
        // Going with option 1 for simplicity
        break;
      }
      
      // Extract values from all results
      const values = results.map(result => result.value as T);
      yield values;
    }
  } finally {
    // Clean up: call return() on all iterators
    for (const iterator of asyncIterators) {
      if (iterator.return != null) {
        void iterator.return();
      }
    }
  }
}

/**
 * Converts an async iterable to an array
 * Warning: This will consume the entire iterable, so use with caution on infinite iterables
 * 
 * @template T - The type of values in the iterable
 * @param iterable - The async iterable to convert
 * @param maxItems - Optional maximum number of items to collect
 * @returns Promise that resolves to an array of all values
 */
export async function asyncIterableToArray<T>(
  iterable: AsyncIterable<T>,
  maxItems?: number
): Promise<T[]> {
  const result: T[] = [];
  let count = 0;
  
  for await (const item of iterable) {
    result.push(item);
    count++;
    
    if (maxItems != null && count >= maxItems) {
      break;
    }
  }
  
  return result;
}

/**
 * Combines multiple async iterators into a single async iterator that yields arrays
 * Each yielded array contains the latest value from each iterator
 * Values persist until a new value arrives from that iterator
 * Only yields initial state once at least one iterator has produced a value
 * 
 * @template T - The type of values yielded by the iterators
 * @param iterators - Array of async iterators to combine
 * @returns An async generator that yields arrays of the latest values
 * 
 * @example
 * ```typescript
 * // iterator1: 100ms -> 'a', 300ms -> 'b'
 * // iterator2: 200ms -> 'c', 400ms -> 'd'
 * // Result:
 * // 100ms -> ['a', null]     (first value arrives)
 * // 200ms -> ['a', 'c']      (second iterator produces value)
 * // 300ms -> ['b', 'c']      (first iterator updates)
 * // 400ms -> ['b', 'd']      (second iterator updates)
 * 
 * for await (const values of combineAsyncIteratorsLatest([iter1, iter2])) {
 *   console.log(values); // Array with latest value from each iterator
 * }
 * ```
 */
export async function* combineAsyncIteratorsLatest<T>(
  iterators: AsyncIterableIterator<T>[]
): AsyncGenerator<(T | null)[], void, unknown> {
  const asyncIterators = iterators.map(iter => iter[Symbol.asyncIterator]());
  
  // Track the latest value from each iterator (null if not yet received)
  const latestValues: (T | null)[] = Array.from(
    { length: iterators.length },
    () => null
  );
  
  // Track which iterators are still active
  let activeCount = asyncIterators.length;
  
  // Sentinel promise that never resolves
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const never = new Promise<never>(() => {});
  
  /**
   * Wraps iterator.next() to include the iterator's index
   */
  function getNext(
    asyncIterator: AsyncIterator<T>,
    index: number
  ): Promise<{ index: number; result: IteratorResult<T> }> {
    return asyncIterator.next().then(result => ({
      index,
      result,
    }));
  }
  
  // Initialize promises array with first next() call for each iterator
  const nextPromises: (
    | Promise<{ index: number; result: IteratorResult<T> }>
    | Promise<never>
  )[] = asyncIterators.map(getNext);
  
  try {
    // Continue until all iterators are done
    while (activeCount > 0) {
      // Race all pending next() calls to get the first available value
      const { index, result } = (await Promise.race(nextPromises)) as {
        index: number;
        result: IteratorResult<T>;
      };
      
      if (result.done) {
        // Iterator is done, mark it with the never promise
        nextPromises[index] = never;
        activeCount--;
      } else {
        // Update the latest value for this iterator
        latestValues[index] = result.value;
        
        // Queue the next value from this iterator
        const iterator = asyncIterators[index];
        if (iterator) {
          nextPromises[index] = getNext(iterator, index);
        }
        
        // Yield a snapshot of all latest values
        yield [...latestValues];
      }
    }
  } finally {
    // Clean up: call return() on any iterators that weren't completed
    for (const [index, iterator] of asyncIterators.entries()) {
      if (nextPromises[index] !== never && iterator.return != null) {
        void iterator.return();
      }
    }
  }
}
