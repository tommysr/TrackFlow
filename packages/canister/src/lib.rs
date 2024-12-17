
#[ic_cdk::query]
fn greet(name: String) -> String {
    let caller = ic_cdk::caller();
    format!("Hello, {}!", caller.to_text())
}

ic_cdk::export_candid!();
