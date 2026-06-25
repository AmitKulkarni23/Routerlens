use crate::types::{ChorusRequest, SseEvent};
use crate::sse::event_to_sse_bytes;
use crate::openrouter::stream_model;
use bytes::Bytes;
use std::sync::Arc;
use tokio::sync::mpsc::Sender;
use tokio_util::sync::CancellationToken;
use tracing::info;
use futures::future::join_all;

pub async fn fan_out(
    request: ChorusRequest,
    tx: Sender<Bytes>,
    client: Arc<crate::openrouter::OpenRouterClient>,
    cancel: CancellationToken,
) {
    let mut handles = Vec::new();

    for model_id in request.model_ids {
        let tx = tx.clone();
        let client = client.clone();
        let prompt = request.prompt.clone();
        let cancel_clone = cancel.clone();
        let model_id_clone = model_id.clone();

        let handle = tokio::spawn({
            let cancel_for_stream = cancel_clone.clone();
            async move {
                tokio::select! {
                    _ = cancel_clone.cancelled() => {
                        info!(model_id = %model_id_clone, "Task cancelled");
                    }
                    _ = stream_model(model_id, prompt, tx, client, cancel_for_stream) => {}
                }
            }
        });

        handles.push(handle);
    }

    // Wait for all tasks to complete
    join_all(handles).await;

    // Send final Done event
    let _ = tx.send(event_to_sse_bytes(&SseEvent::Done)).await;
}
