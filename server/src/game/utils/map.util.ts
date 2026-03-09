/**
 * Returns the first key in the map whose value equals the given value.
 */
export function getMapKeyByValue<K, V>(map: Map<K, V>, value: V): K | undefined {
  for (const [key, val] of map) {
    if (val === value) {
      return key;
    }
  }
  return undefined;
}
