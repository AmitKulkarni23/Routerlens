//! Persistence layer: sqlx-backed writes and reads against Supabase Postgres (task 07).
//!
//! Dynamic queries (not the query! macro) compile without a live database or
//! the sqlx offline cache.

use std::collections::HashMap;

use chrono::{DateTime, NaiveDate, Utc};
use uuid::Uuid;

pub struct Store {
    pool: sqlx::PgPool,
}

impl Store {
    pub async fn connect(database_url: &str) -> Result<Store, sqlx::Error> {
        let pool = sqlx::PgPool::connect(database_url).await?;
        Ok(Store { pool })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RunStatus {
    Completed,
    Partial,
    Failed,
}

impl RunStatus {
    fn as_str(&self) -> &'static str {
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
    fn as_str(&self) -> &'static str {
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

impl Store {
    pub async fn start_run(
        &self,
        bank_version: u32,
        git_sha: Option<String>,
    ) -> Result<Uuid, sqlx::Error> {
        let id = Uuid::new_v4();
        // Initial status 'partial': if the process crashes mid-run, the row
        // correctly represents an incomplete run without any further update.
        sqlx::query(
            "INSERT INTO runs (id, started_at, bank_version, git_sha, status)
             VALUES ($1, now(), $2, $3, 'partial')",
        )
        .bind(id)
        .bind(bank_version as i32)
        .bind(git_sha)
        .execute(&self.pool)
        .await?;
        Ok(id)
    }

    pub async fn finish_run(&self, run_id: Uuid, status: RunStatus) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE runs SET status = $1, finished_at = now() WHERE id = $2")
            .bind(status.as_str())
            .bind(run_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn insert_call(&self, call: NewCall) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO calls
             (run_id, item_id, category, provider, repeat_idx, call_ok, pass,
              raw_response, finish_reason, latency_ms, cost_usd, error_kind)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
        )
        .bind(call.run_id)
        .bind(call.item_id)
        .bind(call.category)
        .bind(call.provider)
        .bind(call.repeat_idx)
        .bind(call.call_ok)
        .bind(call.pass)
        .bind(call.raw_response)
        .bind(call.finish_reason)
        .bind(call.latency_ms)
        .bind(call.cost_usd)
        .bind(call.error_kind)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_item_status_map(
        &self,
    ) -> Result<HashMap<String, ItemStatusValue>, sqlx::Error> {
        let rows = sqlx::query("SELECT item_id, status FROM item_status")
            .fetch_all(&self.pool)
            .await?;

        let mut map = HashMap::new();
        for row in rows {
            use sqlx::Row;
            let item_id: String = row.get("item_id");
            let status: String = row.get("status");
            if let Some(v) = ItemStatusValue::from_str(&status) {
                map.insert(item_id, v);
            }
        }
        Ok(map)
    }

    pub async fn upsert_item_status(
        &self,
        item_id: &str,
        status: ItemStatusValue,
        reason: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO item_status (item_id, status, reason, updated_at)
             VALUES ($1, $2, $3, now())
             ON CONFLICT (item_id) DO UPDATE
             SET status    = excluded.status,
                 reason    = excluded.reason,
                 updated_at = now()",
        )
        .bind(item_id)
        .bind(status.as_str())
        .bind(reason)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_daily_pass_rates(
        &self,
        provider: &str,
        days: u32,
    ) -> Result<Vec<(NaiveDate, f64)>, sqlx::Error> {
        // CAST pass_rate to float8 so sqlx can decode it without a rust_decimal feature.
        let rows = sqlx::query(
            "SELECT day, CAST(pass_rate AS float8) AS pass_rate_f
             FROM daily_provider_stats
             WHERE provider = $1
               AND day >= (now() - make_interval(days => $2))
             ORDER BY day ASC",
        )
        .bind(provider)
        .bind(days as i32)
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::with_capacity(rows.len());
        for row in rows {
            use sqlx::Row;
            let day: DateTime<Utc> = row.get("day");
            let pass_rate: f64 = row.get("pass_rate_f");
            result.push((day.date_naive(), pass_rate));
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
    ) -> Result<Uuid, sqlx::Error> {
        let id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO incidents (id, provider, metric, baseline, observed, delta)
             VALUES ($1,$2,$3,$4,$5,$6)",
        )
        .bind(id)
        .bind(provider)
        .bind(metric)
        .bind(baseline)
        .bind(observed)
        .bind(delta)
        .execute(&self.pool)
        .await?;
        Ok(id)
    }

    pub async fn get_open_incident(
        &self,
        provider: &str,
    ) -> Result<Option<Uuid>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT id FROM incidents WHERE provider = $1 AND resolved_at IS NULL LIMIT 1",
        )
        .bind(provider)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            use sqlx::Row;
            r.get::<Uuid, _>("id")
        }))
    }

    pub async fn resolve_incident(&self, incident_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE incidents SET resolved_at = now() WHERE id = $1")
            .bind(incident_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
