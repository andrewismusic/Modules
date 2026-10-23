// Saved state in localStorage under a versioned key. Bump the key whenever the state shape changes.
// Storage can be unavailable (private windows, blocked site data): every access is guarded.
export function readSaved(key){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch(e){return null;}}
export function writeSaved(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
export function clearSaved(key){try{localStorage.removeItem(key);}catch(e){}}
