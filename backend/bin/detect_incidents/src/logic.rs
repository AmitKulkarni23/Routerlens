pub const DROP_THRESHOLD_POINTS: f64 = 10.0;
pub const RESOLVE_THRESHOLD_POINTS: f64 = 3.0;
pub const MIN_HISTORY_DAYS: usize = 7;

#[derive(Debug, PartialEq)]
pub enum IncidentDecision {
    InsufficientHistory,
    NoIncident,
    Open { baseline: f64, delta: f64 },
    ResolvesOpen,
}

/// Evaluate whether an incident should be opened, resolved, or left alone.
///
/// `history` is daily pass rates **excluding today**, most-recent-last order.
/// Returns `InsufficientHistory` when fewer than `MIN_HISTORY_DAYS` data points exist.
pub fn evaluate_incident(history: &[f64], today: f64) -> IncidentDecision {
    if history.len() < MIN_HISTORY_DAYS {
        return IncidentDecision::InsufficientHistory;
    }
    let baseline = history.iter().sum::<f64>() / history.len() as f64;
    let drop = baseline - today;
    if drop >= DROP_THRESHOLD_POINTS {
        IncidentDecision::Open { baseline, delta: drop }
    } else if drop <= RESOLVE_THRESHOLD_POINTS {
        IncidentDecision::ResolvesOpen
    } else {
        IncidentDecision::NoIncident
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn history(n: usize, rate: f64) -> Vec<f64> {
        vec![rate; n]
    }

    #[test]
    fn evaluate_incident_given_insufficient_history_should_return_insufficient_history() {
        let result = evaluate_incident(&history(5, 80.0), 70.0);
        assert_eq!(result, IncidentDecision::InsufficientHistory);
    }

    #[test]
    fn evaluate_incident_given_ten_point_drop_should_open_incident() {
        let result = evaluate_incident(&history(7, 80.0), 70.0);
        assert_eq!(result, IncidentDecision::Open { baseline: 80.0, delta: 10.0 });
    }

    #[test]
    fn evaluate_incident_given_drop_below_threshold_should_return_no_incident() {
        let result = evaluate_incident(&history(7, 80.0), 75.0);
        assert_eq!(result, IncidentDecision::NoIncident);
    }

    #[test]
    fn evaluate_incident_given_gap_within_resolve_threshold_should_resolve() {
        let result = evaluate_incident(&history(7, 80.0), 78.0);
        assert_eq!(result, IncidentDecision::ResolvesOpen);
    }
}
