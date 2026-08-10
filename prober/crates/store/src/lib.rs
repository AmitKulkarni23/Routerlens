//! Persistence layer: Supabase PostgREST-backed reads and writes.

use std::collections::HashMap;

use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("HTTP: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Supabase {status}: {body}")]
    Api { status: u16, body: String },
    #[error("parse: {0}")]
    Parse(String),
}

#[derive(Clone)]
pub struct Store {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
}

impl Store {
    pub fn new(supabase_url: &str, service_role_key: &str) -> Store {
        Store {
            client: reqwest::Client::new(),
            base_url: supabase_url.trim_end_matches('/').to_string(),
            api_key: service_role_key.to_string(),
        }
    }

    fn url(&self, table: &str) -> String {
        format!("{}/rest/v1/{}", self.base_url, table)
    }

    fn auth_headers(&self) -> reqwest::header::HeaderMap {
        let mut h = reqwest::header::HeaderMap::new();
        h.insert("apikey", self.api_key.parse().unwrap());
        h.insert(
            "Authorization",
            format!("Bearer {}", self.api_key).parse().unwrap(),
        );
        h
    }

    async fn check(resp: reqwest::Response) -> Result<reqwest::Response, StoreError> {
        let status = resp.status();
        if status.is_success() {
            Ok(resp)
        } else {
            let body = resp.text().await.unwrap_or_default();
            Err(StoreError::Api {
                status: status.as_u16(),
                body,
            })
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RunStatus {
    Completed,
    Partial,
    Failed,
}

impl RunStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Completed => "completed",
            Self::Partial => "partial",
            Self::Failed => "failed",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ItemStatusValue {
    Active,
    RetiredTooHard,
    RetiredCeiling,
    Anchor,
}

impl ItemStatusValue {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::RetiredTooHard => "retired_too_hard",
            Self::RetiredCeiling => "retired_ceiling",
            Self::Anchor => "anchor",
        }
    }

    fn from_str(s: &str) -> Option<Self> {
        match s {
            "active" => Some(Self::Active),
            "retired_too_hard" => Some(Self::RetiredTooHard),
            "retired_ceiling" => Some(Self::RetiredCeiling),
            "anchor" => Some(Self::Anchor),
            _ => None,
        }
    }
}

pub struct NewCall {
    pub run_id: Uuid,
    pub item_id: String,
    pub category: String,
    pub provider: String,
    pub repeat_idx: i32,
    pub call_ok: bool,
    pub pass: Option<bool>,
    pub raw_response: Option<String>,
    pub finish_reason: Option<String>,
    pub latency_ms: Option<i32>,
    pub cost_usd: Option<f64>,
    pub error_kind: Option<String>,
}

#[derive(Serialize)]
struct RunInsert {
    id: Uuid,
    started_at: String,
    bank_version: i32,
    git_sha: Option<String>,
    status: &'static str,
}

#[derive(Serialize)]
struct RunFinish {
    status: &'static str,
    finished_at: String,
}

#[derive(Serialize)]
struct CallInsert {
    run_id: Uuid,
    item_id: String,
    category: String,
    provider: String,
    repeat_idx: i32,
    call_ok: bool,
    pass: Option<bool>,
    raw_response: Option<String>,
    finish_reason: Option<String>,
    latency_ms: Option<i32>,
    cost_usd: Option<f64>,
    error_kind: Option<String>,
}

#[derive(Serialize)]
struct ItemStatusInsert {
    item_id: String,
    status: String,
    reason: String,
    updated_at: String,
}

#[derive(Deserialize)]
struct ItemStatusRow {
    item_id: String,
    status: String,
}

#[derive(Deserialize)]
struct DailyPassRateRow {
    day: String,
    pass_rate: Option<f64>,
}

#[derive(Serialize)]
struct IncidentInsert {
    id: Uuid,
    provider: String,
    metric: String,
    baseline: f64,
    observed: f64,
    delta: f64,
}

#[derive(Deserialize)]
struct IdRow {
    id: Uuid,
}

impl Store {
    pub async fn start_run(
        &self,
        bank_version: u32,
        git_sha: Option<String>,
    ) -> Result<Uuid, StoreError> {
        let id = Uuid::new_v4();
        let body = RunInsert {
            id,
            started_at: Utc::now().to_rfc3339(),
            bank_version: bank_version as i32,
            git_sha,
            status: "partial",
        };
        let resp = self
            .client
            .post(self.url("runs"))
            .headers(self.auth_headers())
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        Self::check(resp).await?;
        Ok(id)
    }

    pub async fn finish_run(&self, run_id: Uuid, status: RunStatus) -> Result<(), StoreError> {
        let body = RunFinish {
            status: status.as_str(),
            finished_at: Utc::now().to_rfc3339(),
        };
        let resp = self
            .client
            .patch(format!("{}?id=eq.{}", self.url("runs"), run_id))
            .headers(self.auth_headers())
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        Self::check(resp).await?;
        Ok(())
    }

    pub async fn insert_call(&self, call: NewCall) -> Result<(), StoreError> {
        let body = CallInsert {
            run_id: call.run_id,
            item_id: call.item_id,
            category: call.category,
            provider: call.provider,
            repeat_idx: call.repeat_idx,
            call_ok: call.call_ok,
            pass: call.pass,
            raw_response: call.raw_response,
            finish_reason: call.finish_reason,
            latency_ms: call.latency_ms,
            cost_usd: call.cost_usd,
            error_kind: call.error_kind,
        };
        let resp = self
            .client
            .post(self.url("calls"))
            .headers(self.auth_headers())
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        Self::check(resp).await?;
        Ok(())
    }

    pub async fn get_item_status_map(
        &self,
    ) -> Result<HashMap<String, ItemStatusValue>, StoreError> {
        let resp = self
            .client
            .get(format!("{}?select=item_id,status", self.url("item_status")))
            .headers(self.auth_headers())
            .send()
            .await?;
        let resp = Self::check(resp).await?;
        let rows: Vec<ItemStatusRow> = resp.json().await?;

        let mut map = HashMap::new();
        for row in rows {
            if let Some(v) = ItemStatusValue::from_str(&row.status) {
                map.insert(row.item_id, v);
            }
        }
        Ok(map)
    }

    pub async fn upsert_item_status(
        &self,
        item_id: &str,
        status: ItemStatusValue,
        reason: &str,
    ) -> Result<(), StoreError> {
        let body = ItemStatusInsert {
            item_id: item_id.to_string(),
            status: status.as_str().to_string(),
            reason: reason.to_string(),
            updated_at: Utc::now().to_rfc3339(),
        };
        let resp = self
            .client
            .post(self.url("item_status"))
            .headers(self.auth_headers())
            .header("Content-Type", "application/json")
            .header("Prefer", "resolution=merge-duplicates")
            .json(&body)
            .send()
            .await?;
        Self::check(resp).await?;
        Ok(())
    }

    pub async fn get_daily_pass_rates(
        &self,
        provider: &str,
        days: u32,
    ) -> Result<Vec<(NaiveDate, f64)>, StoreError> {
        let cutoff = (Utc::now() - chrono::Duration::days(days as i64))
            .format("%Y-%m-%d")
            .to_string();
        let resp = self
            .client
            .get(format!(
                "{}?select=day,pass_rate&provider=eq.{}&day=gte.{}&order=day.asc",
                self.url("daily_provider_stats"),
                provider,
                cutoff,
            ))
            .headers(self.auth_headers())
            .send()
            .await?;
        let resp = Self::check(resp).await?;
        let rows: Vec<DailyPassRateRow> = resp.json().await?;

        let mut result = Vec::with_capacity(rows.len());
        for row in rows {
            let day = NaiveDate::parse_from_str(&row.day, "%Y-%m-%d")
                .map_err(|e| StoreError::Parse(format!("bad date '{}': {e}", row.day)))?;
            let rate = row.pass_rate.unwrap_or(0.0);
            result.push((day, rate));
        }
        Ok(result)
    }

    pub async fn insert_incident(
        &self,
        provider: &str,
        metric: &str,
        baseline: f64,
        observed: f64,
        delta: f64,
    ) -> Result<Uuid, StoreError> {
        let id = Uuid::new_v4();
        let body = IncidentInsert {
            id,
            provider: provider.to_string(),
            metric: metric.to_string(),
            baseline,
            observed,
            delta,
        };
        let resp = self
            .client
            .post(self.url("incidents"))
            .headers(self.auth_headers())
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        Self::check(resp).await?;
        Ok(id)
    }

    pub async fn get_open_incident(
        &self,
        provider: &str,
    ) -> Result<Option<Uuid>, StoreError> {
        let resp = self
            .client
            .get(format!(
                "{}?select=id&provider=eq.{}&resolved_at=is.null&limit=1",
                self.url("incidents"),
                provider,
            ))
            .headers(self.auth_headers())
            .send()
            .await?;
        let resp = Self::check(resp).await?;
        let rows: Vec<IdRow> = resp.json().await?;
        Ok(rows.into_iter().next().map(|r| r.id))
    }

    pub async fn resolve_incident(&self, incident_id: Uuid) -> Result<(), StoreError> {
        let resp = self
            .client
            .patch(format!(
                "{}?id=eq.{}",
                self.url("incidents"),
                incident_id,
            ))
            .headers(self.auth_headers())
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "resolved_at": Utc::now().to_rfc3339()
            }))
            .send()
            .await?;
        Self::check(resp).await?;
        Ok(())
    }
}
