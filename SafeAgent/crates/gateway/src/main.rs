use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("safeagent=info")
        .init();

    println!();
    println!("  🛡️  SafeAgent v0.1.0");
    println!("  Secure AI Assistant");
    println!("  ─────────────────────");
    println!();

    tracing::info!("SafeAgent başlatıldı");

    Ok(())
}
