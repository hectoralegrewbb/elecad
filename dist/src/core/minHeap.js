export class MinHeap {
  constructor() {
    this.priorities = [];
    this.values = [];
  }

  get size() {
    return this.values.length;
  }

  push(priority, value) {
    let index = this.values.length;
    this.priorities.push(priority);
    this.values.push(value);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.priorities[parent] <= priority) break;
      this.priorities[index] = this.priorities[parent];
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.priorities[index] = priority;
    this.values[index] = value;
  }

  pop() {
    const topValue = this.values[0];
    const lastPriority = this.priorities.pop();
    const lastValue = this.values.pop();
    const length = this.values.length;
    if (length > 0) {
      let index = 0;
      for (;;) {
        let child = index * 2 + 1;
        if (child >= length) break;
        if (child + 1 < length && this.priorities[child + 1] < this.priorities[child]) child += 1;
        if (this.priorities[child] >= lastPriority) break;
        this.priorities[index] = this.priorities[child];
        this.values[index] = this.values[child];
        index = child;
      }
      this.priorities[index] = lastPriority;
      this.values[index] = lastValue;
    }
    return topValue;
  }
}
