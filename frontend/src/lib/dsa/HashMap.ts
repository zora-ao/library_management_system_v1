/**
 * Data structure 2: hash map with separate chaining.
 *
 * A key is turned into a number by a hash function (value * 31 + character
 * code), and number % capacity picks a bucket. Keys that land in the same
 * bucket (a collision) are kept together in a short list, the "chain".
 *
 * Time:  get / set / has / delete are O(1) on average: we jump straight to one
 *        bucket and only compare the few keys in its chain. Worst case O(n) if
 *        every key landed in the same bucket.
 * Space: O(n) — one entry per key, plus some empty buckets.
 *
 * When the map is more than 75% full it grows to (2 x capacity + 1) buckets and
 * moves every entry (O(n), but rare), so chains stay short.
 */
interface Entry<V> {
  key: string;
  value: V;
}

export class HashMap<V> {
  static readonly MAX_LOAD_FACTOR = 0.75;

  private buckets: Entry<V>[][];
  private count = 0;

  constructor(initialCapacity = 11) {
    if (!Number.isInteger(initialCapacity) || initialCapacity < 1) {
      throw new RangeError("initialCapacity must be a positive whole number");
    }
    this.buckets = HashMap.emptyBuckets(initialCapacity);
  }

  private static emptyBuckets<V>(capacity: number): Entry<V>[][] {
    return Array.from({ length: capacity }, () => []);
  }

  /** Polymorphic string hash, kept within 32 bits so it never loses precision. */
  static hash(key: string): number {
    let value = 0;
    for (let index = 0; index < key.length; index += 1) {
      value = (Math.imul(value, 31) + key.charCodeAt(index)) >>> 0;
    }
    return value;
  }

  private bucketFor(key: string): Entry<V>[] {
    return this.buckets[HashMap.hash(key) % this.buckets.length];
  }

  get size(): number {
    return this.count;
  }

  get capacity(): number {
    return this.buckets.length;
  }

  get loadFactor(): number {
    return this.count / this.buckets.length;
  }

  get(key: string): V | undefined {
    const chain = this.bucketFor(key);
    for (let index = 0; index < chain.length; index += 1) {
      if (chain[index].key === key) return chain[index].value;
    }
    return undefined;
  }

  has(key: string): boolean {
    const chain = this.bucketFor(key);
    for (let index = 0; index < chain.length; index += 1) {
      if (chain[index].key === key) return true;
    }
    return false;
  }

  set(key: string, value: V): this {
    const chain = this.bucketFor(key);
    for (let index = 0; index < chain.length; index += 1) {
      if (chain[index].key === key) {
        chain[index].value = value;
        return this;
      }
    }
    if ((this.count + 1) / this.buckets.length > HashMap.MAX_LOAD_FACTOR) {
      this.resize();
      this.bucketFor(key).push({ key, value });
    } else {
      chain.push({ key, value });
    }
    this.count += 1;
    return this;
  }

  delete(key: string): boolean {
    const chain = this.bucketFor(key);
    for (let index = 0; index < chain.length; index += 1) {
      if (chain[index].key === key) {
        chain.splice(index, 1);
        this.count -= 1;
        return true;
      }
    }
    return false;
  }

  keys(): string[] {
    const result: string[] = [];
    for (const chain of this.buckets) for (const entry of chain) result.push(entry.key);
    return result;
  }

  /** Length of the longest chain: shows how well the hash spreads keys out. */
  get longestChain(): number {
    let longest = 0;
    for (const chain of this.buckets) longest = Math.max(longest, chain.length);
    return longest;
  }

  private resize(): void {
    const old = this.buckets;
    this.buckets = HashMap.emptyBuckets(old.length * 2 + 1);
    for (const chain of old) {
      for (const entry of chain) this.bucketFor(entry.key).push(entry);
    }
  }
}

/** Put items into groups by key in one pass: O(n) time, O(n) space. */
export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): HashMap<T[]> {
  const groups = new HashMap<T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

/** Count items per key in one pass: O(n) time, O(k) space for k distinct keys. */
export function countBy<T>(items: readonly T[], keyOf: (item: T) => string | null | undefined): HashMap<number> {
  const counts = new HashMap<number>();
  for (const item of items) {
    const key = keyOf(item);
    if (key == null) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
