pub mod math;
pub mod l96;
pub mod methods;
pub mod simulation;

use simulation::{SimPayload, run_simulation};

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, size: usize) {
    if !ptr.is_null() {
        let _ = Vec::from_raw_parts(ptr, 0, size);
    }
}

/// Runs full DA simulation given JSON payload bytes.
/// Returns pointer to buffer formatted as: [4-byte u32 little-endian length][UTF-8 JSON string bytes]
#[no_mangle]
pub unsafe extern "C" fn run_simulation_wasm(ptr: *const u8, len: usize) -> *const u8 {
    let slice = std::slice::from_raw_parts(ptr, len);
    let payload_res: Result<SimPayload, _> = serde_json::from_slice(slice);

    let output_json = match payload_res {
        Ok(payload) => match run_simulation(payload) {
            Ok(output) => serde_json::to_string(&output).unwrap_or_else(|e| format!(r#"{{"error":"{}"}}"#, e)),
            Err(e) => format!(r#"{{"error":"{}"}}"#, e),
        },
        Err(e) => format!(r#"{{"error":"Invalid payload JSON: {}"}}"#, e),
    };

    let bytes = output_json.into_bytes();
    let total_len = 4 + bytes.len();
    let mut out_buf = Vec::with_capacity(total_len);
    let len_u32 = bytes.len() as u32;
    out_buf.extend_from_slice(&len_u32.to_le_bytes());
    out_buf.extend_from_slice(&bytes);

    let res_ptr = out_buf.as_ptr();
    std::mem::forget(out_buf);
    res_ptr
}
