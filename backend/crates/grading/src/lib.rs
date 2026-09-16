//! Mechanical grading: numeric, exact, exact_nospace, json strategies (task 06).

use bank::GradeType;

const NUMERIC_EPSILON: f64 = 1e-9;

pub fn grade(grade_type: GradeType, expected: &str, actual: &str) -> bool {
    match grade_type {
        GradeType::Numeric => grade_numeric(expected, actual),
        GradeType::Exact => grade_exact(expected, actual),
        GradeType::ExactNospace => grade_exact_nospace(expected, actual),
        GradeType::Json => grade_json(expected, actual),
    }
}

fn normalize_numeric(s: &str) -> Option<f64> {
    let cleaned: String = s
        .chars()
        .filter(|c| !c.is_whitespace() && *c != ',')
        .collect();
    let cleaned = cleaned.trim_end_matches('.');
    cleaned.parse::<f64>().ok()
}

fn grade_numeric(expected: &str, actual: &str) -> bool {
    match (normalize_numeric(expected), normalize_numeric(actual)) {
        (Some(e), Some(a)) => (e - a).abs() < NUMERIC_EPSILON,
        _ => false,
    }
}

fn grade_exact(expected: &str, actual: &str) -> bool {
    expected.trim() == actual.trim()
}

fn grade_exact_nospace(expected: &str, actual: &str) -> bool {
    let strip = |s: &str| -> String { s.chars().filter(|c| !c.is_whitespace()).collect() };
    strip(expected) == strip(actual)
}

fn strip_code_fence(s: &str) -> &str {
    let s = s.trim();
    if s.starts_with("```") {
        let after_open = &s[3..];
        let body = match after_open.find('\n') {
            Some(nl) => &after_open[nl + 1..],
            None => after_open,
        };
        if let Some(close) = body.rfind("```") {
            return body[..close].trim();
        }
    }
    s
}

fn grade_json(expected: &str, actual: &str) -> bool {
    let actual_stripped = strip_code_fence(actual);
    match (
        serde_json::from_str::<serde_json::Value>(expected),
        serde_json::from_str::<serde_json::Value>(actual_stripped),
    ) {
        (Ok(e), Ok(a)) => e == a,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grade_numeric_given_commas_and_trailing_period_should_match() {
        assert!(grade_numeric("121401", "121,401."));
    }

    #[test]
    fn grade_numeric_given_malformed_actual_should_return_false() {
        assert!(!grade_numeric("43", "forty-three"));
    }

    #[test]
    fn grade_exact_nospace_given_internal_whitespace_variance_should_match() {
        assert!(grade_exact_nospace("[1, 2, 3]", "[1,2,3]"));
    }

    #[test]
    fn grade_json_given_markdown_fence_and_key_order_variance_should_match() {
        let expected = r#"{"a":1,"b":2}"#;
        let actual = "```json\n{\"b\": 2, \"a\": 1}\n```";
        assert!(grade_json(expected, actual));
    }

    #[test]
    fn grade_json_given_malformed_json_should_return_false() {
        assert!(!grade_json(r#"{"status":"ok"}"#, "{status: ok"));
    }
}
