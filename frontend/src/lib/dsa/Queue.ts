/**
 * Data structure 3: queue (first in, first out), built as a linked list.
 *
 * Borrow requests are served in the order students made them: the oldest
 * request is at the front and is handled next; new requests join at the back.
 *
 * Time:  enqueue, dequeue, peek and size are O(1) — we keep pointers to both
 *        ends, so nothing is shifted (unlike Array.shift(), which is O(n)).
 *        toArray() is O(n).
 * Space: O(n) — one node per item.
 */
interface Node<T> {
  value: T;
  next: Node<T> | null;
}

export class Queue<T> {
  private head: Node<T> | null = null;
  private tail: Node<T> | null = null;
  private length = 0;

  constructor(items: Iterable<T> = []) {
    for (const item of items) this.enqueue(item);
  }

  /** Add to the back of the line. */
  enqueue(value: T): void {
    const node: Node<T> = { value, next: null };
    if (this.tail) this.tail.next = node;
    else this.head = node;
    this.tail = node;
    this.length += 1;
  }

  /** Remove and return the front of the line, or undefined if empty. */
  dequeue(): T | undefined {
    const node = this.head;
    if (!node) return undefined;
    this.head = node.next;
    if (!this.head) this.tail = null;
    this.length -= 1;
    return node.value;
  }

  /** Look at the front of the line without removing it. */
  peek(): T | undefined {
    return this.head?.value;
  }

  get size(): number {
    return this.length;
  }

  isEmpty(): boolean {
    return this.length === 0;
  }

  /** Items from front to back. */
  toArray(): T[] {
    const items: T[] = [];
    for (let node = this.head; node; node = node.next) items.push(node.value);
    return items;
  }
}
