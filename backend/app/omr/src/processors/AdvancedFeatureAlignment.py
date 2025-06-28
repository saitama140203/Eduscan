"""
Advanced Feature-based alignment preprocessor for OMRChecker.
Supports ORB, AKAZE, and SIFT feature detectors.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Optional

from .interfaces.base_processor import BaseProcessor
from ..utils.image import ImageUtils
from ..utils.interaction import InteractionUtils
from ..logger import logger

class AdvancedFeatureAlignment(BaseProcessor):
    def __init__(self, *args, **kwargs):
        """
        Args:
            options (dict): config dict, must contain 'reference'
            tuning_config (object): tuning/config object, must have .dimensions.processing_width/height and .outputs.show_image_level
            relative_dir (Path): base dir for reference path
        """
        super().__init__(*args, **kwargs)
        self.options = kwargs.get("options", {})
        self.tuning_config = kwargs.get("tuning_config", None)
        self.relative_dir = kwargs.get("relative_dir", Path("."))

        if not self.tuning_config:
            raise ValueError("tuning_config is required for AdvancedFeatureAlignment.")

        # Get reference template path
        self.ref_path = self.relative_dir.joinpath(self.options["reference"])
        self.feature_type = self.options.get("featureType", "ORB")
        self.max_features = int(self.options.get("maxFeatures", 5000))
        self.good_match_percent = self.options.get("goodMatchPercent", 0.2)
        self.resize_template = self.options.get("resizeTemplate", False)

        # Load and prepare reference image
        ref_img = cv2.imread(str(self.ref_path), cv2.IMREAD_GRAYSCALE)
        if ref_img is None:
            logger.error(f"Could not load reference image: {self.ref_path}")
            raise FileNotFoundError(f"Reference image not found at {self.ref_path}")

        # Resize reference to processing dimensions
        proc_w = self.tuning_config.dimensions.processing_width
        proc_h = self.tuning_config.dimensions.processing_height
        self.ref_img = ImageUtils.resize_util(ref_img, proc_w, proc_h)

        # Initialize feature detector
        self._init_detector()

        # Extract features from reference image
        self.ref_kp, self.ref_des = self.detector.detectAndCompute(self.ref_img, None)
        logger.info(f"Detected {len(self.ref_kp)} keypoints in reference image")

    def _init_detector(self) -> None:
        """Initialize the feature detector based on type."""
        if self.feature_type == "ORB":
            self.detector = cv2.ORB_create(self.max_features)
            self.norm_type = cv2.NORM_HAMMING
        elif self.feature_type == "AKAZE":
            self.detector = cv2.AKAZE_create()
            self.norm_type = cv2.NORM_HAMMING
        elif self.feature_type == "SIFT":
            self.detector = cv2.SIFT_create(self.max_features)
            self.norm_type = cv2.NORM_L2
        else:
            raise ValueError(f"Unknown feature type: {self.feature_type}")
        logger.info(f"Initialized {self.feature_type} detector with max {self.max_features} features")

    def __str__(self):
        return f"{self.ref_path.name} ({self.feature_type})"

    def exclude_files(self):
        return [self.ref_path]

    def apply_filter(self, image: np.ndarray, file_path: str) -> Optional[np.ndarray]:
        """Aligns the input image to the reference template using feature matching."""
        config = self.tuning_config

        # Normalize image
        image = cv2.normalize(image, None, 0, 255, norm_type=cv2.NORM_MINMAX)

        # Detect features in input image
        input_kp, input_des = self.detector.detectAndCompute(image, None)
        logger.info(f"Detected {len(input_kp)} keypoints in input image")

        if input_des is None or len(input_kp) < 10:
            logger.error(f"Too few keypoints detected in {file_path}")
            return None

        try:
            matcher = cv2.BFMatcher(self.norm_type, crossCheck=True)
            matches = matcher.match(self.ref_des, input_des)
            matches = sorted(matches, key=lambda x: x.distance)

            num_good_matches = max(10, int(len(matches) * self.good_match_percent))
            good_matches = matches[:num_good_matches]

            logger.info(f"Using {len(good_matches)} good matches out of {len(matches)} total")

            ref_pts = np.float32([self.ref_kp[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
            input_pts = np.float32([input_kp[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

            H, mask = cv2.findHomography(input_pts, ref_pts, cv2.RANSAC, 5.0)

            if H is None:
                logger.error("Failed to compute homography")
                return None

            inliers = np.sum(mask)
            inlier_ratio = inliers / len(mask) if len(mask) > 0 else 0
            logger.info(f"Homography inlier ratio: {inlier_ratio:.2f} ({inliers}/{len(mask)})")

            h, w = self.ref_img.shape
            aligned = cv2.warpPerspective(image, H, (w, h))

            # Debug visualization
            if hasattr(config, "outputs") and getattr(config.outputs, "show_image_level", 0) >= 3:
                match_img = cv2.drawMatches(
                    self.ref_img, self.ref_kp,
                    image, input_kp,
                    good_matches[:50], None,
                    flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS
                )
                InteractionUtils.show(
                    f"Feature Matches ({self.feature_type})",
                    match_img,
                    resize=True,
                    config=config
                )

                before_after = np.hstack([
                    ImageUtils.resize_util_h(image, h),
                    aligned
                ])
                InteractionUtils.show(
                    "Before/After Alignment",
                    before_after,
                    resize=True,
                    config=config
                )

            return aligned

        except Exception as e:
            logger.error(f"Error during feature matching: {str(e)}")
            return None
