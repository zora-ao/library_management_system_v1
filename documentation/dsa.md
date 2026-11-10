# Data Structures and Algorithms

The library system implements three data structures of its own in [`frontend/src/lib/dsa`](../frontend/src/lib/dsa) and uses them in the pages staff and students work with every day.

| # | Data structure | Algorithms | Used in |
|---|---|---|---|
| 1 | Array | Linear search, merge sort | All 8 search bars and their result lists |
| 2 | Hash map (separate chaining) | Hashing, chaining, resizing | Users page (loans per user), Book Catalog (books per genre), queue positions |
| 3 | Queue (linked list, FIFO) | Enqueue, dequeue | Borrow Requests: pending requests served first come, first served |

## Problem analysis and requirements

| Problem in the library | Requirement | Structure chosen | Why it fits |
|---|---|---|---|
| Find books, users, requests and loans by any part of a name, title, email or ISBN | Match text anywhere in a field ("Code" in "Clean Code"), combined with dropdown filters | Array + **linear search** | Text can appear anywhere, so no ordering can skip items; one pass checks the text and every filter together |
| Show results in a chosen order (title A–Z, newest, due date…) | Stable, predictable order | Array + **merge sort** | O(n log n) in every case, and stable: equal items keep their order |
| The Users table shows each user's active loans; the catalog shows books per genre | Answer "how many for this key?" for many keys without rescanning everything | **Hash map** | Group once in O(n), then each row is an O(1) lookup |
| Librarians should handle borrow requests fairly | Oldest request first, new requests join the back | **Queue** (FIFO) | Exactly first-in, first-out; enqueue and dequeue are O(1) |

## 1. Array: linear search and merge sort

**Files:** [`linearSearch.ts`](../frontend/src/lib/dsa/linearSearch.ts), [`mergeSort.ts`](../frontend/src/lib/dsa/mergeSort.ts)

Every search bar runs the same three steps in the browser:

1. `linearSearch(items, matches)` checks each item once. `matches` tests the search text with `containsText()` and the dropdown filters (genre, role, status…) in the same pass.
2. `mergeSort(matches, compare)` orders only the m items that matched.
3. `slice()` takes one page of k items.

| Operation | Time | Space | Why |
|---|---|---|---|
| Linear search | O(n) | O(m) for the matches | Each of the n items is checked once; the matches go in a new array |
| Each dropdown filter | O(1) per item | — | One comparison, done inside the same loop |
| Merge sort | O(n log n) | O(n) | Halving gives about log₂ n levels; merging at each level moves all n items once; merging needs a temporary array |
| Whole search | O(n + m log m) | O(m) | Search all n, sort only the m matches |

| Page | Search box looks in | Filters | Code |
|---|---|---|---|
| Book Catalog | title, author, ISBN, genre | genre, available now | [`BookCatalogPage.tsx`](../frontend/src/pages/usersPage/BookCatalogPage.tsx) |
| Books List (staff) | title, author, ISBN, category | category, availability, archive date | [`bookListView.ts`](../frontend/src/features/books/lib/bookListView.ts) |
| Borrow Requests | student, email, book, author, reference | request date | [`borrowRequestView.ts`](../frontend/src/features/borrows/lib/borrowRequestView.ts) |
| Loans & Returns | student, email, book, author, loan ID | overdue, due today, on time / late | [`AdminBorrowsPage.tsx`](../frontend/src/pages/adminPage/AdminBorrowsPage.tsx), [`loanView.ts`](../frontend/src/features/borrows/lib/loanView.ts) |
| Users | username, email | role, active status | [`userWorkspace.ts`](../frontend/src/features/auth/lib/userWorkspace.ts) |
| Categories | category name | — | [`categoryWorkspace.ts`](../frontend/src/features/books/lib/categoryWorkspace.ts) |
| My Borrows | book title, author | status, history period | [`borrow-view.ts`](../frontend/src/features/borrows/borrow-view.ts) |
| My Favorites | title, author, genre | availability | [`MyFavoritesPage.tsx`](../frontend/src/pages/usersPage/MyFavoritesPage.tsx) |

## 2. Hash map (separate chaining)

**File:** [`HashMap.ts`](../frontend/src/lib/dsa/HashMap.ts)

A key is turned into a number with a polynomial hash (`value × 31 + character code`, kept to 32 bits), and `number % capacity` picks a bucket. Keys that land in the same bucket are kept in that bucket's list, the chain. When the map is more than 75% full it grows to `2 × capacity + 1` buckets and moves every entry, so chains stay short.

| Operation | Time | Space | Why |
|---|---|---|---|
| `get`, `set`, `has`, `delete` | O(1) average, O(n) worst | — | Jump straight to one bucket and compare only its short chain; the worst case only happens if every key lands in one bucket |
| Resize | O(n), rarely | — | Every entry moves once; doubling makes it rare, so inserts stay O(1) on average |
| `groupBy`, `countBy` | O(n) | O(n) | One pass over the items |
| Storage | — | O(n) | One entry per key, plus empty buckets |

**Where it's used:**

- **Users page:** before, each table row called `getActiveLoansForUser()`, which scanned every borrow: O(users × borrows). Now [`indexActiveLoansByUser()`](../frontend/src/features/auth/lib/userWorkspace.ts) groups the active loans by user once, O(borrows), and each row looks up its loans in O(1).
- **Book Catalog:** the genre buttons showed a count by filtering all books once per genre: O(genres × books). Now `countBy()` counts every genre in one pass and each button is an O(1) lookup.
- **Borrow Requests:** `getQueuePositions()` maps each pending request's ID to its place in line, so each table row finds its position in O(1).

## 3. Queue (first in, first out)

**File:** [`Queue.ts`](../frontend/src/lib/dsa/Queue.ts)

A linked list with pointers to both ends. `enqueue()` adds at the back, `dequeue()` removes from the front, so nothing is ever shifted.

| Operation | Time | Space | Why |
|---|---|---|---|
| `enqueue`, `dequeue`, `peek`, `size` | O(1) | — | Only the head or tail pointer changes |
| `toArray` | O(n) | O(n) | Walks the list once |
| Storage | — | O(n) | One node per item |

**Where it's used:** [`buildPendingQueue()`](../frontend/src/features/borrows/lib/borrowRequestView.ts) sorts pending borrow requests oldest first and enqueues them. The Borrow Requests page shows each request's place in line (`#1`, `#2`, …) with a **Next** badge on the front of the queue. Positions come from the whole queue, so they stay correct while staff search or re-sort the table.

## Performance comparison

Run with `node scripts/benchmark-dsa.ts` from the `frontend` folder. Median of 25 runs, Node v24.19.0, Windows 11, on deterministic data:

| Task | Ours | Time | Compared with | Time |
|---|---|---:|---|---:|
| Search 1,000 books | `linearSearch` | 0.061 ms | `Array.filter` (built-in) | 0.105 ms |
| Sort 1,000 books by title | `mergeSort` | 2.184 ms | `Array.sort`, TimSort (built-in) | 4.644 ms |
| Loans for 300 users (3,000 borrows) | `HashMap`: group once, O(1) per user | 0.880 ms | Scan all borrows per user | 26.264 ms |
| 1,000 lookups by key | `HashMap.get` | 0.077 ms | `Map.get` (built-in) | 0.063 ms |
| Serve 20,000 requests in order | `Queue.dequeue`, O(1) | 0.713 ms | `Array.shift`, O(n) per call | 51.210 ms |

**What the numbers show:**

- **Different Big-O, big gap.** The hash map is about 30× faster than rescanning every borrow per user, and the queue is about 70× faster than `Array.shift()`, which moves every remaining item on each call.
- **Same Big-O, similar speed.** Linear search vs `filter` and merge sort vs TimSort have the same Big-O, so their times are close; at these sizes the differences are mostly measurement noise.
- **The built-in `Map` is slightly faster** than our `HashMap`, because it is implemented natively by the browser engine.

These are single-machine timings, so treat them as illustrations of the Big-O, not exact results.

## Testing

| Test file | What it checks |
|---|---|
| [`dsa.test.ts`](../frontend/src/lib/dsa/dsa.test.ts) | Linear search order and one check per item; merge sort is stable, does not change its input, matches the built-in sort on random data, and treats `NaN` comparisons like the built-in; hash map collisions, resizing, missing keys and invalid capacity; queue FIFO order and empty-queue behaviour |
| [`userWorkspace.test.ts`](../frontend/src/features/auth/lib/userWorkspace.test.ts) | The loans-by-user hash map gives the same result as scanning every borrow |
| [`borrowRequestView.test.ts`](../frontend/src/features/borrows/lib/borrowRequestView.test.ts) | Pending requests are queued oldest first, positions are 1, 2, 3…, and an empty queue is handled |
| [`BorrowRequestWorkflow.test.tsx`](../frontend/src/features/borrows/components/BorrowRequestWorkflow.test.tsx) | The table shows `#1` with **Next**, `#2`, and hides the column outside the pending tab |
| Existing page tests (`bookListView`, `categoryWorkspace`, `borrow-view`, …) | Search, filter and sort results are unchanged after switching to our implementations |

**A bug the tests caught:** two loans with no due date compare as `Infinity − Infinity = NaN`. The built-in sort treats `NaN` as "equal", but the first version of our merge sort swapped them. The existing My Borrows test failed, and merge sort now treats `NaN` as a tie, like the built-in.
