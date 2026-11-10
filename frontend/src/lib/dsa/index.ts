// Our own data structures and algorithms, used by the real pages:
// 1. Array:     linearSearch (every search bar) and mergeSort (every result list)
// 2. Hash map:  loans per user on the Users page, genre counts in the catalog
// 3. Queue:     pending borrow requests, served first come, first served
export { containsText, linearSearch } from "./linearSearch";
export { mergeSort, type Compare } from "./mergeSort";
export { HashMap, countBy, groupBy } from "./HashMap";
export { Queue } from "./Queue";
