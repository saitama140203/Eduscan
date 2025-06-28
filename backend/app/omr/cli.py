# cli.py
import argparse

def parse_arguments():
    parser = argparse.ArgumentParser(
        description="High-performance OMR processing with separated template and input directories.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("input_dir", type=str, help="Directory containing the images to be processed.")
    parser.add_argument("-t", "--template", type=str, required=True,
                        help="Full path to the .json template file for the OMR form.")
    parser.add_argument("-m", "--yolo-model", type=str, required=True,
                        help="Path to the YOLO model file (e.g., best.pt).")
    yolo_group = parser.add_argument_group('YOLO Options')
    yolo_group.add_argument("-c", "--conf", type=float, default=0.25, help="YOLO confidence threshold (default: 0.25).")
    yolo_group.add_argument("-w", "--workers", type=int, default=None,
                            help="Number of parallel workers (default: auto).")
    align_group = parser.add_argument_group('Alignment Options')
    align_group.add_argument("--auto-align", action="store_true", help="Enable automatic feature-based alignment.")
    align_group.add_argument("-r", "--align-reference", type=str,
                             help="Path to the reference image (a clean scan of the form).")
    align_group.add_argument("--align-method", type=str, default="ORB", choices=["ORB", "SIFT", "AKAZE"],
                             help="Feature detection method (default: ORB).")
    align_group.add_argument("--align-debug", action="store_true",
                             help="Show visual debugging windows for the alignment process.")
    parser.add_argument("--answer-key-excel", type=str, required=True,
                             help="Path to answer key Excel file (có thể gồm nhiều mã đề, mỗi sheet là 1 mã đề)")

    parser.epilog = """
Examples:
  1. Basic usage:
     python -m omr_processor ./scans/batch_01 -t ./templates/midterm.json -m ./models/best.pt
  2. With auto-alignment:
     python -m omr_processor ./scans/batch_02 -t ./templates/final.json -m ./models/best.pt --auto-align -r ./templates/final_ref.png --align-method SIFT
"""
    return parser.parse_args()
