import { describe, expect, it } from "vitest";

import { HashMap, Queue, containsText, countBy, groupBy, linearSearch, mergeSort } from ".";

describe("linearSearch", () => {
  const books = ["Clean Code", "Code Complete", "Moby Dick"];

  it("returns every match in the original order and leaves the input alone", () => {
    const input = [...books];
    expect(linearSearch(input, (title) => title.includes("Code"))).toEqual(["Clean Code", "Code Complete"]);
    expect(input).toEqual(books);
  });

  it("checks each item exactly once", () => {
    let checks = 0;
    linearSearch(books, () => { checks += 1; return false; });
    expect(checks).toBe(books.length);
  });

  it("handles an empty list and no matches", () => {
    expect(linearSearch([], () => true)).toEqual([]);
    expect(linearSearch(books, () => false)).toEqual([]);
  });
});

describe("containsText", () => {
  it("ignores case and surrounding spaces, and skips missing values", () => {
    expect(containsText([null, undefined, "Robert MARTIN"], "  martin ")).toBe(true);
    expect(containsText([null, "Clean Code"], "dick")).toBe(false);
  });

  it("treats an empty search as matching everything", () => {
    expect(containsText([], "   ")).toBe(true);
  });
});

describe("mergeSort", () => {
  const byNumber = (a: number, b: number) => a - b;

  it("sorts without changing the input", () => {
    const input = [5, 3, 9, 1, 3];
    expect(mergeSort(input, byNumber)).toEqual([1, 3, 3, 5, 9]);
    expect(input).toEqual([5, 3, 9, 1, 3]);
  });

  it("is stable: equal items keep their original order", () => {
    const books = [
      { title: "B", id: 1 },
      { title: "A", id: 2 },
      { title: "B", id: 3 },
      { title: "A", id: 4 },
    ];
    const sorted = mergeSort(books, (a, b) => a.title.localeCompare(b.title));
    expect(sorted.map((book) => book.id)).toEqual([2, 4, 1, 3]);
  });

  it("gives the same order as the built-in sort on random data", () => {
    let seed = 42;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % 1000; };
    const values = Array.from({ length: 500 }, random);
    expect(mergeSort(values, byNumber)).toEqual([...values].sort(byNumber));
  });

  it("treats a NaN comparison as equal, like the built-in sort", () => {
    const loans = [{ id: "a", due: Infinity }, { id: "b", due: Infinity }, { id: "c", due: 5 }];
    const byDue = (x: { due: number }, y: { due: number }) => x.due - y.due;
    expect(mergeSort(loans, byDue).map((loan) => loan.id)).toEqual([...loans].sort(byDue).map((loan) => loan.id));
  });

  it("handles empty and one-item lists", () => {
    expect(mergeSort([], byNumber)).toEqual([]);
    expect(mergeSort([7], byNumber)).toEqual([7]);
  });
});

describe("HashMap", () => {
  it("stores, updates, finds and deletes values", () => {
    const map = new HashMap<number>();
    map.set("978-0-13", 1).set("978-0-32", 2).set("978-0-13", 3);

    expect(map.get("978-0-13")).toBe(3);
    expect(map.has("978-0-32")).toBe(true);
    expect(map.size).toBe(2);
    expect(map.delete("978-0-32")).toBe(true);
    expect(map.has("978-0-32")).toBe(false);
    expect(map.size).toBe(1);
  });

  it("returns undefined / false for missing keys instead of throwing", () => {
    const map = new HashMap<string>();
    expect(map.get("missing")).toBeUndefined();
    expect(map.has("missing")).toBe(false);
    expect(map.delete("missing")).toBe(false);
  });

  it("keeps colliding keys apart in the same bucket's chain", () => {
    const map = new HashMap<number>(11);
    // "a" is 97 and "l" is 108; both are 9 after % 11, so they share bucket 9.
    expect(HashMap.hash("a") % 11).toBe(HashMap.hash("l") % 11);
    map.set("a", 1).set("l", 2);

    expect(map.capacity).toBe(11);
    expect(map.longestChain).toBe(2);
    expect(map.get("a")).toBe(1);
    expect(map.get("l")).toBe(2);
    expect(map.get("w")).toBeUndefined();
  });

  it("grows when over 75% full and keeps every entry", () => {
    const map = new HashMap<number>(3);
    for (let index = 0; index < 100; index += 1) map.set(`user-${index}`, index);

    expect(map.size).toBe(100);
    expect(map.capacity).toBeGreaterThan(100 / HashMap.MAX_LOAD_FACTOR - 1);
    expect(map.loadFactor).toBeLessThanOrEqual(HashMap.MAX_LOAD_FACTOR);
    for (let index = 0; index < 100; index += 1) expect(map.get(`user-${index}`)).toBe(index);
    expect(map.keys()).toHaveLength(100);
    expect(map.longestChain).toBeLessThan(10);
  });

  it("computes the same hash every time", () => {
    expect(HashMap.hash("abc")).toBe(HashMap.hash("abc"));
    expect(HashMap.hash("abc")).toBe(((97 * 31 + 98) * 31) + 99);
  });

  it("rejects an invalid starting capacity", () => {
    expect(() => new HashMap(0)).toThrow(RangeError);
    expect(() => new HashMap(2.5)).toThrow(RangeError);
  });

  it("groups and counts items in one pass", () => {
    const loans = [{ user: "u1" }, { user: "u2" }, { user: "u1" }];
    expect(groupBy(loans, (loan) => loan.user).get("u1")).toHaveLength(2);
    const counts = countBy(["Fiction", null, "Science", "Fiction", undefined], (genre) => genre);
    expect(counts.get("Fiction")).toBe(2);
    expect(counts.get("Science")).toBe(1);
    expect(counts.size).toBe(2);
  });
});

describe("Queue", () => {
  it("serves items first in, first out", () => {
    const queue = new Queue(["req-1", "req-2"]);
    queue.enqueue("req-3");

    expect(queue.peek()).toBe("req-1");
    expect(queue.dequeue()).toBe("req-1");
    expect(queue.dequeue()).toBe("req-2");
    queue.enqueue("req-4");
    expect(queue.toArray()).toEqual(["req-3", "req-4"]);
    expect(queue.size).toBe(2);
  });

  it("returns undefined when empty instead of throwing", () => {
    const queue = new Queue<string>();
    expect(queue.isEmpty()).toBe(true);
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.peek()).toBeUndefined();
    queue.enqueue("only");
    queue.dequeue();
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue("again");
    expect(queue.toArray()).toEqual(["again"]);
  });
});
