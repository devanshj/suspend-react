type Pipe = {
  <A, B>(a: A, ab: (a: A) => B): B
  <A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C
}
export const pipe =
  ((a: any, ...fs: any[]) => fs.reduce((a, f) => f(a), a)) as Pipe

type AssertNever = (never?: never) => never
export const assertNever = (() => {}) as AssertNever

type IsPromise = (t: unknown) => t is Promise<unknown>
export const isPromise =
  (t => typeof (t as any).then === "function") as IsPromise

export type Map<K, T extends Keyable<K>> = T[]
type Keyable<K> =
  { key: K
  , equal(a: K, b: K): boolean
    // bivariant call signature to keep K covariant
  }

export namespace Map {
  type Create = <K, T extends Keyable<K>>
    () => Map<K, T>
  export const create = (() => []) as unknown as Create

  type Get = <K, T extends Keyable<K>>
    (key: K) => (map: Map<K, T>) => T | undefined
  export const get: Get = key => map => {
    for (let value of map) if (value.equal(key, value.key)) return value;
    return undefined;
  }

  type GetIndex = <K, T extends Keyable<K>, M extends Map<K, T>>
    (key: K) => (map: M) => Arr.Index<Map<K, T>> | -1
  const getIndex: GetIndex = key => map => {
    for (let [i, value] of Arr.entries(map)) if (value.equal(key, value.key)) return i;
    return -1;
  }

  type Add = <T extends Keyable<unknown>>
    (value: T) => (map: Map<T["key"], T>) => void
  export const add: Add = value => map => {
    let index = pipe(map, getIndex(value.key));
    if (index === -1) {
      map.push(value);
      return;
    }
    pipe(map, Arr.set(index, value))
  }

  type Remove = <K, T extends Keyable<K>>
    (key: K) => (map: Map<K, T>) => void
  export const remove: Remove = key => map => {
    let index = pipe(map, getIndex(key));
    if (index === -1) return;
    pipe(map, Arr.remove(index));
  }

  type RemoveAll = <K, T extends Keyable<K>>
    (map: Map<K, T>) => void
  export const removeAll: RemoveAll = Arr.removeAll
}

export namespace Time {
  type SetTimeout = (f: () => void, duration: Duration) => void
  export const setTimeout: SetTimeout = window.setTimeout

  export type Duration =
    number & { __Duration: number }
}

export namespace Arr {
  type Entries = <T extends unknown[]>
    (xs: T) => Iterable<[Index<T>, T[number]]>
  export const entries = (xs => xs.entries()) as Entries;

  export type Index<T extends unknown[]> =
    number & { __Index: void, __Array: T }

  type Set = <T extends unknown[]>
    (index: Index<T>, value: T[number]) => (xs: T) => void
  export const set: Set = (i, v) => xs =>
    void (xs[i] = v);

  type Remove = <T extends unknown[]>
    (index: Index<T>) => (xs: T) => void
  export const remove: Remove = i => xs =>
    void xs.splice(i, 1);

  type RemoveAll = <T extends unknown[]>
    (xs: T) => void
  export const removeAll: RemoveAll = xs =>
    void xs.splice(0, xs.length)

  type ShallowEqual = <T extends unknown[]>
    (a: T, b: T) => boolean
  export const shallowEqual: ShallowEqual = (a, b) =>
    a === b ||
    ( a.length === b.length &&
      a.every((_, i) => a[i] === b[i])
    )
}

export namespace Fn {
  type Apply = <A extends unknown[], R>
    (a: A) => (f: (...a: A) => R) => R
  export const apply: Apply = a => f => f(...a)
}

export namespace O {
  type Replace = <O, N extends O>
    (n: N) => (o: O) => void
  export const replace: Replace = n => o => 
    void Object.assign(o, n);
}