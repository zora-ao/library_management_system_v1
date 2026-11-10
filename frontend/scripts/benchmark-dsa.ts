/**
 * Performance comparison for our data structures (src/lib/dsa).
 * Run from the frontend folder:   node scripts/benchmark-dsa.ts
 *
 * Each row times our structure against the simpler method or the built-in,
 * on the same deterministic data. Times are the median of several runs.
 */
import { HashMap, groupBy } from "../src/lib/dsa/HashMap.ts";
import { linearSearch } from "../src/lib/dsa/linearSearch.ts";
import { mergeSort } from "../src/lib/dsa/mergeSort.ts";
import { Queue } from "../src/lib/dsa/Queue.ts";

const RUNS = 25;

let seed = 104;
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed;
};

function median(task: () => void): number {
  task(); // warm-up
  const times: number[] = [];
  for (let run = 0; run < RUNS; run += 1) {
    const start = performance.now();
    task();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)];
}

const rows: { task: string; ours: string; other: string; oursMs: number; otherMs: number }[] = [];
function compare(task: string, ours: string, oursTask: () => void, other: string, otherTask: () => void) {
  rows.push({ task, ours, other, oursMs: median(oursTask), otherMs: median(otherTask) });
}

const BOOKS = 1000;
const books = Array.from({ length: BOOKS }, (_, index) => ({ id: `book-${index}`, title: `Title ${random() % 100000}` }));
const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title);

compare(`Search ${BOOKS} books`,
  "linearSearch", () => { linearSearch(books, (book) => book.title.includes("99")); },
  "Array.filter (built-in)", () => { books.filter((book) => book.title.includes("99")); });

compare(`Sort ${BOOKS} books by title`,
  "mergeSort", () => { mergeSort(books, byTitle); },
  "Array.sort, TimSort (built-in)", () => { [...books].sort(byTitle); });

const USERS = 300;
const BORROWS = 3000;
const borrows = Array.from({ length: BORROWS }, (_, index) => ({ id: index, userId: `user-${random() % USERS}` }));
const userIds = Array.from({ length: USERS }, (_, index) => `user-${index}`);

compare(`Loans for ${USERS} users (${BORROWS} borrows)`,
  "HashMap: group once, O(1) per user", () => {
    const index = groupBy(borrows, (borrow) => borrow.userId);
    for (const userId of userIds) index.get(userId);
  },
  "Scan all borrows per user", () => {
    for (const userId of userIds) borrows.filter((borrow) => borrow.userId === userId);
  });

const lookups = new HashMap<number>();
const builtIn = new Map<string, number>();
for (const book of books) { lookups.set(book.id, 1); builtIn.set(book.id, 1); }
compare(`${BOOKS} lookups by key`,
  "HashMap.get", () => { for (const book of books) lookups.get(book.id); },
  "Map.get (built-in)", () => { for (const book of books) builtIn.get(book.id); });

const REQUESTS = 20000;
compare(`Serve ${REQUESTS.toLocaleString("en-US")} requests in order`,
  "Queue.dequeue, O(1)", () => {
    const queue = new Queue<number>();
    for (let index = 0; index < REQUESTS; index += 1) queue.enqueue(index);
    while (!queue.isEmpty()) queue.dequeue();
  },
  "Array.shift, O(n) per call", () => {
    const line: number[] = [];
    for (let index = 0; index < REQUESTS; index += 1) line.push(index);
    while (line.length) line.shift();
  });

const ms = (value: number) => `${value.toFixed(3)} ms`;
console.log(`Median of ${RUNS} runs · Node ${process.version}\n`);
console.log("| Task | Ours | Time | Compared with | Time |");
console.log("| --- | --- | ---: | --- | ---: |");
for (const row of rows) {
  console.log(`| ${row.task} | ${row.ours} | ${ms(row.oursMs)} | ${row.other} | ${ms(row.otherMs)} |`);
}
