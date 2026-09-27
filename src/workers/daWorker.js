// データ同化の数値計算は Rust/WebAssembly (crates/eduda_wasm) が一手に担う。
// このワーカーは JSON ペイロードの受け渡しに徹する。
const WASM_URL = '/wasm/eduda_wasm.wasm';

let wasmExportsPromise = null;

function loadWasm() {
  if (!wasmExportsPromise) {
    wasmExportsPromise = (async () => {
      const res = await fetch(WASM_URL);
      if (!res.ok) {
        throw new Error(`${WASM_URL} (HTTP ${res.status})`);
      }
      const { instance } = await WebAssembly.instantiate(await res.arrayBuffer(), {});
      return instance.exports;
    })();
  }
  return wasmExportsPromise;
}

function runSimulation(exports, payload) {
  const { alloc, dealloc, run_simulation_wasm, memory } = exports;
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));

  const ptr = alloc(jsonBytes.length);
  new Uint8Array(memory.buffer, ptr, jsonBytes.length).set(jsonBytes);

  const resPtr = run_simulation_wasm(ptr, jsonBytes.length);
  dealloc(ptr, jsonBytes.length);

  // 返り値は [4byte LE 長さ][UTF-8 JSON] のレイアウト
  const respLen = new DataView(memory.buffer, resPtr, 4).getUint32(0, true);
  const respStr = new TextDecoder().decode(new Uint8Array(memory.buffer, resPtr + 4, respLen));
  const result = JSON.parse(respStr);

  if (result.error) {
    throw new Error(result.error);
  }
  return result;
}

self.onmessage = async function (e) {
  if (e.data.type !== 'RUN_SIMULATION') return;

  try {
    const exports = await loadWasm();
    self.postMessage({ type: 'RESULT', payload: runSimulation(exports, e.data.payload) });
  } catch (err) {
    self.postMessage({ type: 'ERROR', payload: err.message });
  }
};
