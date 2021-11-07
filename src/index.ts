import { Map, pipe, Time, Fn, Arr, O, assertNever, isPromise } from "./extras"

const cache =
  Map.create() as Cache

const suspendImpl: SuspendImpl = (resolver, key, options) => {
  let cacheValue = pipe(cache, Map.get(key))
  if (cacheValue) {
    if (cacheValue.status === "PENDING") throw cacheValue.promise
    if (cacheValue.status === "FULFILLED") return cacheValue.value
    if (cacheValue.status === "REJECTED") throw cacheValue.error
    assertNever(cacheValue)
  }
  
  let newCacheValue: CacheValue = {
    key,
    status: "PENDING",
    promise: pipe(resolver, Fn.apply(key)),
    equal: options?.equal ?? Arr.shallowEqual,
    lifespan: options?.lifespan,
  }

  pipe(cache, Map.add(newCacheValue as CacheValue));

  newCacheValue.promise.then(value => {
    pipe(newCacheValue, O.replace({
      ...newCacheValue,
      status: "FULFILLED",
      value,
    }))

    if (newCacheValue.lifespan) {
      Time.setTimeout(() => {
        pipe(cache, Map.remove(newCacheValue.key))
      }, newCacheValue.lifespan)
    }
  })

  newCacheValue.promise.catch((error: CacheRejectedError) => {
    pipe(newCacheValue, O.replace({
      ...newCacheValue,
      status: "REJECTED",
      error,
    }))
  })

  return suspendImpl(resolver, key, options);
}
export const suspend = suspendImpl as Suspend;

const preloadImpl: PreloadImpl = (...a) => {
  try {
    suspendImpl(...a);
  } catch (e) {
    if (isPromise(e)) return
    throw e
  }
}
export const preload = preloadImpl as Preload;

const clearImpl: ClearImpl = key => {
  if (key === undefined) {
    pipe(cache, Map.removeAll)
    return;
  }
  pipe(cache, Map.remove(key))
}
export const clear = clearImpl as Clear

const peekImpl: PeekImpl = key => {
  let cacheValue = pipe(cache, Map.get(key))
  return (
    cacheValue?.status === "FULFILLED"
      ? cacheValue.value
      : undefined
  )
}
export const peek = peekImpl as Peek;

type Cache = Map<CacheKey, CacheValue>;
type CacheKey = unknown[] & { __CacheKey: void }
type CacheValue =
  & ( { status: "PENDING", promise: Promise<CacheFulfilledValue> }
    | { status: "FULFILLED", value: CacheFulfilledValue }
    | { status: "REJECTED", error: CacheRejectedError }
    )
  & { key: CacheKey
    , equal: (a: CacheKey, b: CacheKey) => boolean
    , lifespan: Time.Duration | undefined
    }

type CacheFulfilledValue = {} & { __CacheFulfilledValue: void }
type CacheRejectedError = {} & { __CacheError: void }

export interface Types {}

type UnknownMap = [unknown[], unknown][]
type TMap = 
  Types extends { map: UnknownMap }
    ? Types["map"]
    : UnknownMap;

type Key = TMap[number][0]

type Value<K> =
  { [I in keyof TMap]:
      TMap[I] extends [infer Tk, infer Tv]
        ? Tk extends K ? Tv : never
        : never
  }[keyof TMap] 


type Suspend =
  <R extends (...key: K) => Promise<Value<K>>, K extends Key>
    (resolver: R, key: K, options?: SuspendOptions<K>) =>
      R extends () => Promise<infer T> ? T : never

type SuspendImpl = 
  ( resolver: (...key: CacheKey) => Promise<CacheFulfilledValue>
  , key: CacheKey
  , options?: SuspendOptionsImpl
  ) =>
    CacheFulfilledValue

interface SuspendOptions<K extends Key>
  { equal?: (a: K, b: K) => boolean
  , lifespan?: number
  }

interface SuspendOptionsImpl
  { equal?: (a: CacheKey, b: CacheKey) => boolean
  , lifespan?: Time.Duration
  }

type Preload =
  <R extends (...key: K) => Promise<Value<K>>, K extends Key>
    (resolver: R, key: K, options?: SuspendOptions<K>) =>
      void

type PreloadImpl = 
  ( resolver: (...key: CacheKey) => Promise<CacheFulfilledValue>
  , key: CacheKey
  , options?: SuspendOptionsImpl
  ) =>
    void

type Clear = (key?: Key) => void
type ClearImpl = (key?: CacheKey) => void

type Peek = <K extends Key>(key: K) => Value<K> | undefined
type PeekImpl = (key: CacheKey) => CacheFulfilledValue | undefined
