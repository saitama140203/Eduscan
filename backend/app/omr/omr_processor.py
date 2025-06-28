# __main__.py
import sys
import logging
from cli import parse_arguments
from main_pipeline import yolo_omr_batch_parallel

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', stream=sys.stdout)


if __name__ == "__main__":
    try:
        args = parse_arguments()
        yolo_omr_batch_parallel(args)
    except Exception as e:
        logging.exception(f"\nAn unhandled error occurred: {e}")
        sys.exit(1)
