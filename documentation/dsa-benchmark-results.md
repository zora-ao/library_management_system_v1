# Pahina DSA Benchmark Results

Generated (UTC): `2026-11-07T14:46:15.754006+00:00`

## Reproducible configuration

- Seed: `104`
- Sizes: `100 1000 10000`
- Warm-ups per callable: `1`
- Repetitions: `3`
- Lookups per timed batch: `50`
- Wall-clock limit: `120` seconds
- Estimated record-visit ceiling: `20,000,000`
- Python: `CPython 3.14.2`
- Platform: `Windows-11-10.0.26200-SP0`
- Processor: `Intel64 Family 6 Model 142 Stepping 12, GenuineIntel`

The records are deterministically generated library books with realistic titles, authors, ISBN formatting, availability, and dates. Controlled fixtures include first/middle/last/missing title targets, duplicate normalized titles, missing ISBNs, colliding hash keys, a normalized duplicate ISBN pair, and inclusive/empty range queries.

No database, HTTP, frontend, or network work is timed. Fixture generation, correctness checks, JSON/Markdown formatting, and file I/O occur outside measured regions. Garbage collection is disabled only around each timed callable and then restored. A preflight workload ceiling rejects excessive configurations, and a wall-clock deadline is checked between bounded algorithm calls.

Preflight estimate: `192` benchmark callables, `6,000` individual lookup/range queries, and at most approximately `11,100,000` record visits across the four scan-like batches. This is a safety estimate for those dominant batches, not an upper bound on sorting, construction, or correctness work.

Normalized ISBN lookup targets are unique. The current ISBN index policy is **last record wins** when two raw ISBN strings normalize to the same key; that policy is verified separately and is not presented as equivalent to a multi-result linear lookup.

`lookup` rows are warm structure/search costs. `preprocessing` rows show sorting or index/tree construction separately. `cold_batch_total` rows add aligned preprocessing and the full configured lookup batch; they are cold batch totals, not single-lookup measurements. Timing medians and nearest-rank p95 values are descriptive measurements, not proof of Big-O complexity.

This run uses `3` repetitions; percentile estimates are less stable than the originally planned 25-sample configuration. The reduced count is recorded rather than relabeling or reusing measurements from another configuration.

## n=100: Linear vs Binary Title

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `linear_exact_lookup_batch` | lookup | 3 | 36,963,900 | 37,926,600 | `{"comparisons":5000,"lookups":50,"results":50}` |
| `binary_exact_lookup_batch` | lookup | 3 | 4,875,900 | 5,564,500 | `{"comparisons":640,"lookups":50,"results":50}` |
| `binary_merge_sort_preprocessing` | preprocessing | 3 | 6,750,600 | 8,550,100 | `{"comparisons":541,"writes":1344}` |
| `binary_cold_batch_total` | cold_batch_total | 3 | 11,626,500 | 13,333,700 | `{"lookups":50}` |

## n=100: Linear vs Hash ISBN

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `linear_isbn_lookup_batch` | lookup | 3 | 10,511,000 | 10,683,900 | `{"comparisons":3102,"lookups":50,"results":38}` |
| `hash_isbn_lookup_batch` | lookup | 3 | 427,900 | 521,500 | `{"lookups":50,"results":38}` |
| `hash_index_build` | preprocessing | 3 | 1,804,600 | 2,157,200 | `{"capacity":191,"collisions":48,"indexed_records":93,"max_chain_length":3,"normalized_duplicates":1,"resizes":4,"skipped_isbns":6}` |
| `hash_cold_batch_total` | cold_batch_total | 3 | 2,326,100 | 2,585,100 | `{"lookups":50}` |

## n=100: Custom Merge vs Python sorted

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `python_sorted` | sorting | 3 | 711,200 | 719,100 | `{"items":100}` |
| `custom_merge_sort` | sorting | 3 | 8,078,500 | 8,507,700 | `{"comparisons":541,"items":100,"writes":1344}` |

## n=100: BST vs Baselines

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `binary_exact_lookup_batch` | lookup | 3 | 4,932,900 | 5,095,200 | `{"comparisons":640,"lookups":50,"results":50}` |
| `bst_exact_lookup_batch` | lookup | 3 | 1,132,000 | 1,604,000 | `{"comparisons":380,"lookups":50,"nodes_visited":380,"results":50}` |
| `linear_range_query_batch` | lookup | 3 | 36,389,200 | 37,793,900 | `{"comparisons":7839,"lookups":50,"results":2278}` |
| `bst_range_query_batch` | lookup | 3 | 4,528,600 | 4,534,500 | `{"comparisons":4952,"lookups":50,"nodes_visited":2476,"results":2278}` |
| `bst_merge_sort_preprocessing` | preprocessing | 3 | 13,231,400 | 14,650,500 | `{"comparisons":541,"writes":1344}` |
| `bst_build_preprocessing` | preprocessing | 3 | 752,300 | 753,800 | `{"tree_height":7,"tree_size":100}` |
| `binary_exact_cold_batch_total` | cold_batch_total | 3 | 18,164,300 | 18,541,000 | `{"lookups":50}` |
| `bst_exact_cold_batch_total` | cold_batch_total | 3 | 14,910,300 | 17,008,300 | `{"lookups":50}` |
| `bst_range_cold_batch_total` | cold_batch_total | 3 | 18,518,200 | 19,797,700 | `{"lookups":50}` |

## n=1000: Linear vs Binary Title

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `linear_exact_lookup_batch` | lookup | 3 | 243,290,500 | 391,385,500 | `{"comparisons":50000,"lookups":50,"results":50}` |
| `binary_exact_lookup_batch` | lookup | 3 | 5,620,700 | 5,783,100 | `{"comparisons":960,"lookups":50,"results":50}` |
| `binary_merge_sort_preprocessing` | preprocessing | 3 | 112,757,500 | 132,836,700 | `{"comparisons":8702,"writes":19952}` |
| `binary_cold_batch_total` | cold_batch_total | 3 | 118,378,200 | 136,224,700 | `{"lookups":50}` |

## n=1000: Linear vs Hash ISBN

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `linear_isbn_lookup_batch` | lookup | 3 | 103,280,400 | 147,437,900 | `{"comparisons":30539,"lookups":50,"results":38}` |
| `hash_isbn_lookup_batch` | lookup | 3 | 630,900 | 642,000 | `{"lookups":50,"results":38}` |
| `hash_index_build` | preprocessing | 3 | 11,670,600 | 12,963,900 | `{"capacity":1535,"collisions":395,"indexed_records":940,"max_chain_length":2,"normalized_duplicates":1,"resizes":7,"skipped_isbns":59}` |
| `hash_cold_batch_total` | cold_batch_total | 3 | 12,301,500 | 13,368,700 | `{"lookups":50}` |

## n=1000: Custom Merge vs Python sorted

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `python_sorted` | sorting | 3 | 9,629,500 | 9,777,400 | `{"items":1000}` |
| `custom_merge_sort` | sorting | 3 | 113,307,300 | 130,745,800 | `{"comparisons":8702,"items":1000,"writes":19952}` |

## n=1000: BST vs Baselines

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `binary_exact_lookup_batch` | lookup | 3 | 4,970,500 | 5,003,300 | `{"comparisons":960,"lookups":50,"results":50}` |
| `bst_exact_lookup_batch` | lookup | 3 | 684,900 | 883,100 | `{"comparisons":510,"lookups":50,"nodes_visited":510,"results":50}` |
| `linear_range_query_batch` | lookup | 3 | 379,915,600 | 420,002,600 | `{"comparisons":78339,"lookups":50,"results":22678}` |
| `bst_range_query_batch` | lookup | 3 | 28,654,700 | 36,297,600 | `{"comparisons":45984,"lookups":50,"nodes_visited":22992,"results":22678}` |
| `bst_merge_sort_preprocessing` | preprocessing | 3 | 112,136,900 | 117,977,900 | `{"comparisons":8702,"writes":19952}` |
| `bst_build_preprocessing` | preprocessing | 3 | 6,657,200 | 6,995,300 | `{"tree_height":10,"tree_size":1000}` |
| `binary_exact_cold_batch_total` | cold_batch_total | 3 | 117,107,400 | 122,784,600 | `{"lookups":50}` |
| `bst_exact_cold_batch_total` | cold_batch_total | 3 | 118,793,700 | 125,658,100 | `{"lookups":50}` |
| `bst_range_cold_batch_total` | cold_batch_total | 3 | 146,794,400 | 161,270,800 | `{"lookups":50}` |

## n=10000: Linear vs Binary Title

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `linear_exact_lookup_batch` | lookup | 3 | 3,081,086,500 | 6,231,636,300 | `{"comparisons":500000,"lookups":50,"results":50}` |
| `binary_exact_lookup_batch` | lookup | 3 | 10,119,500 | 10,323,400 | `{"comparisons":1310,"lookups":50,"results":50}` |
| `binary_merge_sort_preprocessing` | preprocessing | 3 | 2,125,855,600 | 2,443,862,100 | `{"comparisons":120114,"writes":267232}` |
| `binary_cold_batch_total` | cold_batch_total | 3 | 2,135,975,100 | 2,454,185,500 | `{"lookups":50}` |

## n=10000: Linear vs Hash ISBN

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `linear_isbn_lookup_batch` | lookup | 3 | 726,032,300 | 798,702,300 | `{"comparisons":305039,"lookups":50,"results":38}` |
| `hash_isbn_lookup_batch` | lookup | 3 | 300,900 | 435,100 | `{"lookups":50,"results":38}` |
| `hash_index_build` | preprocessing | 3 | 152,853,000 | 167,642,500 | `{"capacity":24575,"collisions":3406,"indexed_records":9410,"max_chain_length":3,"normalized_duplicates":1,"resizes":11,"skipped_isbns":589}` |
| `hash_cold_batch_total` | cold_batch_total | 3 | 153,136,700 | 168,077,600 | `{"lookups":50}` |

## n=10000: Custom Merge vs Python sorted

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `python_sorted` | sorting | 3 | 98,733,300 | 120,989,500 | `{"items":10000}` |
| `custom_merge_sort` | sorting | 3 | 2,789,683,900 | 3,049,946,600 | `{"comparisons":120114,"items":10000,"writes":267232}` |

## n=10000: BST vs Baselines

Correctness gates passed before timing.

| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |
|---|---|---:|---:|---:|---|
| `binary_exact_lookup_batch` | lookup | 3 | 15,117,400 | 38,344,700 | `{"comparisons":1310,"lookups":50,"results":50}` |
| `bst_exact_lookup_batch` | lookup | 3 | 2,716,600 | 10,904,400 | `{"comparisons":770,"lookups":50,"nodes_visited":770,"results":50}` |
| `linear_range_query_batch` | lookup | 3 | 4,738,067,800 | 5,824,821,100 | `{"comparisons":783339,"lookups":50,"results":226678}` |
| `bst_range_query_batch` | lookup | 3 | 526,906,700 | 715,679,500 | `{"comparisons":454248,"lookups":50,"nodes_visited":227124,"results":226678}` |
| `bst_merge_sort_preprocessing` | preprocessing | 3 | 2,527,898,800 | 2,576,756,900 | `{"comparisons":120114,"writes":267232}` |
| `bst_build_preprocessing` | preprocessing | 3 | 206,277,900 | 287,365,500 | `{"tree_height":14,"tree_size":10000}` |
| `binary_exact_cold_batch_total` | cold_batch_total | 3 | 2,542,075,700 | 2,591,874,300 | `{"lookups":50}` |
| `bst_exact_cold_batch_total` | cold_batch_total | 3 | 2,784,823,800 | 2,817,980,900 | `{"lookups":50}` |
| `bst_range_cold_batch_total` | cold_batch_total | 3 | 3,201,867,600 | 3,309,941,500 | `{"lookups":50}` |

## Findings from this run

At the largest smoke dataset (`n=10,000`), the warm linear-title batch took 304.47x the binary-search batch, and the warm linear-ISBN batch took 2412.87x the hash-lookup batch. These comparisons exclude the required merge-sort or hash-index build; cold-batch totals and the break-even table below retain those costs.

The custom merge sort took 28.25x the Python `sorted()` baseline at `n=10,000`. Both produced identical stable order, but `sorted()` is optimized runtime code while the educational implementation performs Python-level recursion, normalization, comparison counting, and write counting.

For the balanced BST, binary exact lookup took 5.56x the BST exact batch after both structures were built. Linear range scanning took 8.99x the pruned BST range batch. Range costs still grow with the number of returned records, so a BST cannot make a large output set constant-time.

## Big-O agreement

Wall-clock measurements are noisy and do not prove complexity. The deterministic operation counts provide the stronger comparison:

| Feature | Expected complexity | Operation-count trend | Agreement |
|---|---|---|---|
| Linear exact title | `O(n)` per query | n=100: 5,000, n=1,000: 50,000, n=10,000: 500,000 | Comparisons grow in direct proportion to `n`. |
| Binary exact title | `O(log n + k)` | n=100: 640, n=1,000: 960, n=10,000: 1,310 | Comparisons grow slowly as `n` increases tenfold. |
| Custom merge sort | `O(n log n)` time, `O(n)` auxiliary space | n=100: 541, n=1,000: 8,702, n=10,000: 120,114 | Comparison growth is consistent with `n log n`; runtime is slower than optimized `sorted()`. |
| Hash ISBN lookup/build | Average `O(1)` lookup after `O(n)` build; `O(n)` collision worst case | n=100: 93, n=1,000: 940, n=10,000: 9,410 indexed records; fixed `50`-lookup batches | Lookup time remains small while build work grows with the dataset. |
| Balanced BST exact | `O(log n + k)` | n=100: 380, n=1,000: 510, n=10,000: 770 nodes visited | Node visits grow slowly; reported tree heights remain logarithmic. |
| Balanced BST range | `O(log n + k)` | n=100: 2,278, n=1,000: 22,678, n=10,000: 226,678 returned records | Runtime and visits grow with output size `k`, as expected. |

## Approximate measured break-even

For repeated lookups, the comparison is `build + q × warm lookup` for the structured approach versus `q × baseline lookup`. The per-lookup values below divide each median batch by the configured lookup count; the threshold is therefore an approximate interpretation of these batch measurements, not a separately timed single-query result or proof of asymptotic complexity.

| n | Comparison | One-time preprocessing median (ns) | Baseline median/lookup (ns) | Structured median/lookup (ns) | Approximate break-even |
|---:|---|---|---:|---:|---|
| 100 | Binary title vs linear | merge sort: 6,750,600 | 739,278 | 97,518 | about 11 lookups |
| 100 | Hash ISBN vs linear | hash index: 1,804,600 | 210,220 | 8,558 | about 9 lookups |
| 100 | BST exact vs binary exact | BST only (merge shared): 752,300 | 98,658 | 22,640 | about 10 lookups |
| 100 | BST range vs linear range | merge + BST: 13,983,700 | 727,784 | 90,572 | about 22 lookups |
| 1,000 | Binary title vs linear | merge sort: 112,757,500 | 4,865,810 | 112,414 | about 24 lookups |
| 1,000 | Hash ISBN vs linear | hash index: 11,670,600 | 2,065,608 | 12,618 | about 6 lookups |
| 1,000 | BST exact vs binary exact | BST only (merge shared): 6,657,200 | 99,410 | 13,698 | about 78 lookups |
| 1,000 | BST range vs linear range | merge + BST: 118,794,100 | 7,598,312 | 573,094 | about 17 lookups |
| 10,000 | Binary title vs linear | merge sort: 2,125,855,600 | 61,621,730 | 202,390 | about 35 lookups |
| 10,000 | Hash ISBN vs linear | hash index: 152,853,000 | 14,520,646 | 6,018 | about 11 lookups |
| 10,000 | BST exact vs binary exact | BST only (merge shared): 206,277,900 | 302,348 | 54,332 | about 832 lookups |
| 10,000 | BST range vs linear range | merge + BST: 2,734,176,700 | 94,761,356 | 10,538,134 | about 33 lookups |

## Interpretation limits

- Synthetic records are deterministic and domain-shaped, but they do not reproduce database caches, browser behavior, network latency, or every production catalog distribution.
- Python `sorted()` is an optimized runtime baseline; the custom merge sort exists for correctness, instrumentation, and instruction rather than a production speed claim.
- Hash lookup is average O(1) after an O(n) build and remains O(n) in the collision worst case. The current index is rebuilt for each educational snapshot.
- Binary search, hash lookup, and BST measurements depend on sorted/prebuilt state. For a single lookup, compare the one-time preprocessing median plus one approximate warm lookup against the baseline; do not divide the one-time build cost across the whole batch.
- This smoke run records only 3 raw samples per measurement. With nearest-rank p95, p95 is the maximum sample in this `3`-sample run and is especially sensitive to scheduler noise.
- Raw samples and operation counts are preserved in the JSON report so conclusions do not depend only on wall-clock medians.
