"""Data drift detection module for model predictions."""

from collections import deque
from typing import Optional

from .metrics import record_drift_alert, set_drift_window_size

# ============================================================================
# CONFIGURATION
# ============================================================================

WINDOW_SIZE = 100  # Number of predictions to track
DRIFT_THRESHOLD = 0.15  # 15% threshold for drift detection
MIN_WINDOW_SIZE = 20  # Minimum samples needed to check for drift


# ============================================================================
# DRIFT DETECTOR CLASS
# ============================================================================


class DataDriftDetector:
    """
    Detects data drift in model predictions using a sliding window approach.
    
    Tracks model predictions in a rolling window and compares the current
    mean prediction to the reference baseline. If the deviation exceeds
    the threshold, a drift alert is triggered.
    """

    def __init__(
        self,
        window_size: int = WINDOW_SIZE,
        drift_threshold: float = DRIFT_THRESHOLD,
        min_window_size: int = MIN_WINDOW_SIZE,
    ):
        """
        Initialize the drift detector.

        Args:
            window_size: Number of predictions to keep in the rolling window
            drift_threshold: Fractional threshold for detecting drift (e.g., 0.15 = 15%)
            min_window_size: Minimum samples required before checking for drift
        """
        self.window_size = window_size
        self.drift_threshold = drift_threshold
        self.min_window_size = min_window_size
        self.reference_mean: Optional[float] = None
        self.prediction_window: deque[float] = deque(maxlen=window_size)

    def add_prediction(self, prediction_value: float) -> bool:
        """
        Add a new prediction to the window and check for drift.

        Args:
            prediction_value: Single prediction value (typically between 0 and 1)

        Returns:
            True if drift is detected, False otherwise
        """
        self.prediction_window.append(prediction_value)

        # Initialize reference mean on first call
        if self.reference_mean is None:
            self.reference_mean = prediction_value
            return False

        # Check for drift only if window is sufficiently populated
        if len(self.prediction_window) < self.min_window_size:
            return False

        return self._check_drift()

    def _check_drift(self) -> bool:
        """
        Check if current mean prediction deviates from reference mean.

        Returns:
            True if drift detected, False otherwise
        """
        current_mean = sum(self.prediction_window) / len(self.prediction_window)
        
        # Calculate percentage change from reference
        if self.reference_mean == 0:
            # Avoid division by zero - check absolute change instead
            relative_change = abs(current_mean - self.reference_mean)
        else:
            relative_change = abs(current_mean - self.reference_mean) / abs(self.reference_mean)

        # Detect drift if change exceeds threshold
        if relative_change > self.drift_threshold:
            record_drift_alert()
            set_drift_window_size(len(self.prediction_window))
            return True

        return False

    def get_current_mean(self) -> Optional[float]:
        """
        Get the current mean prediction in the window.

        Returns:
            Mean of predictions in current window, or None if window is empty
        """
        if not self.prediction_window:
            return None
        return sum(self.prediction_window) / len(self.prediction_window)

    def get_window_size(self) -> int:
        """Get current number of predictions in the window."""
        return len(self.prediction_window)

    def reset_reference(self, new_reference: Optional[float] = None) -> None:
        """
        Reset the reference baseline for drift detection.

        Args:
            new_reference: New baseline value. If None, uses current mean.
        """
        if new_reference is not None:
            self.reference_mean = new_reference
        elif self.prediction_window:
            self.reference_mean = sum(self.prediction_window) / len(self.prediction_window)

    def get_reference_mean(self) -> Optional[float]:
        """Get the current reference baseline mean."""
        return self.reference_mean


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

# Global drift detector instance (shared across requests)
_drift_detector: Optional[DataDriftDetector] = None


def get_drift_detector() -> DataDriftDetector:
    """
    Get or create the global drift detector instance.

    Returns:
        Singleton DataDriftDetector instance
    """
    global _drift_detector
    if _drift_detector is None:
        _drift_detector = DataDriftDetector(
            window_size=WINDOW_SIZE,
            drift_threshold=DRIFT_THRESHOLD,
            min_window_size=MIN_WINDOW_SIZE,
        )
    return _drift_detector


def check_prediction_drift(prediction_value: float) -> bool:
    """
    Check if a new prediction indicates data drift.

    Convenience function that uses the global drift detector instance.

    Args:
        prediction_value: Model prediction value to check

    Returns:
        True if drift detected, False otherwise
    """
    detector = get_drift_detector()
    return detector.add_prediction(prediction_value)


def get_drift_window_stats() -> dict[str, float | int | None]:
    """
    Get statistics about the current drift detection window.

    Returns:
        Dictionary with window stats (mean, size, reference_mean)
    """
    detector = get_drift_detector()
    return {
        "current_mean": detector.get_current_mean(),
        "window_size": detector.get_window_size(),
        "reference_mean": detector.get_reference_mean(),
        "window_capacity": detector.window_size,
    }
