# template.py
from .src.constants import FIELD_TYPES
import json
import logging
import os

logger = logging.getLogger(__name__)

class BubblePoint:
    def __init__(self, x, y, qid, choice):
        self.x, self.y, self.qid, self.choice = x, y, qid, choice

class FieldBlock:
    def __init__(self, name, field_data, template_bubble_dims):
        self.name = name
        self.origin = field_data['origin']
        self.bubble_dimensions = field_data.get('bubbleDimensions', template_bubble_dims)
        self.dimensions = self._calculate_dimensions(field_data)
        self.traverse_bubbles = self._generate_traverse_bubbles(field_data)

    def _calculate_dimensions(self, field_data):
        rows = field_data.get('rows', 1)
        cols = field_data.get('cols', 1)
        b_gap = field_data.get('bubblesGap', 60)
        l_gap = field_data.get('labelsGap', 60)
        bw, bh = self.bubble_dimensions
        ft = field_data['fieldType']
        direction = FIELD_TYPES.get(ft, {}).get('direction', 'horizontal')
        if direction == "vertical":
            w = (cols - 1) * l_gap + bw
            h = (rows - 1) * b_gap + bh
        else:
            w = (cols - 1) * b_gap + bw
            h = (rows - 1) * l_gap + bh
        return [int(w), int(h)]

    def _generate_traverse_bubbles(self, field_data):
        ft = field_data['fieldType']
        field_type_cfg = FIELD_TYPES.get(ft, {})
        bubble_values = field_type_cfg.get("bubbleValues", ["A", "B", "C", "D", "E"][:field_data.get('cols', 5)])
        direction = field_type_cfg.get("direction", "horizontal")

        fl = field_data['fieldLabels']
        bg = field_data.get('bubblesGap', 60)
        lg = field_data.get('labelsGap', 60)
        ox, oy = self.origin

        tb = []
        if direction.lower() == "vertical":
            for c_idx, f_lbl in enumerate(fl):
                tb.append([
                    BubblePoint(ox + c_idx * lg, oy + r_idx * bg, f_lbl, ch)
                    for r_idx, ch in enumerate(bubble_values)
                ])
        else:
            for r_idx, f_lbl in enumerate(fl):
                tb.append([
                    BubblePoint(ox + c_idx * bg, oy + r_idx * lg, f_lbl, ch)
                    for c_idx, ch in enumerate(bubble_values)
                ])
        return tb

class TemplateOMR:
    def __init__(self, template_data):
        self.page_dimensions, self.bubble_dimensions = template_data['pageDimensions'], template_data.get(
            'bubbleDimensions', [54, 54])
        self.field_blocks = [FieldBlock(n, d, self.bubble_dimensions) for n, d in
                             template_data.get('fieldBlocks', {}).items()]

def get_all_bubbles(template):
    return [dict(qid=pt.qid, choice=pt.choice, bounds=(int(pt.x), int(pt.y), int(pt.x + bw), int(pt.y + bh)))
            for blk in template.field_blocks
            for strip in blk.traverse_bubbles
            for pt in strip
            for bw, bh in [blk.bubble_dimensions]]

def load_template(template_path):
    """Load template với error handling tốt hơn cho encoding và auto-detect file JSON"""
    try:
        logger.info(f"Loading template from: {template_path}")
        
        # Auto-detect file template.json nếu path không phải file JSON
        actual_template_path = template_path
        
        # Nếu path không kết thúc bằng .json
        if not template_path.lower().endswith('.json'):
            # Nếu là file ảnh hoặc thư mục, tìm file template.json
            if os.path.isfile(template_path):
                # Nếu là file ảnh, tìm template.json trong cùng thư mục
                template_dir = os.path.dirname(template_path)
                potential_json = os.path.join(template_dir, "template.json")
                if os.path.exists(potential_json):
                    actual_template_path = potential_json
                    logger.info(f"Auto-detected template.json: {actual_template_path}")
                else:
                    raise FileNotFoundError(f"No template.json found in directory: {template_dir}")
            elif os.path.isdir(template_path):
                # Nếu là thư mục, tìm template.json bên trong
                potential_json = os.path.join(template_path, "template.json")
                if os.path.exists(potential_json):
                    actual_template_path = potential_json
                    logger.info(f"Auto-detected template.json: {actual_template_path}")
                else:
                    raise FileNotFoundError(f"No template.json found in directory: {template_path}")
            else:
                # Thử append /template.json
                potential_json = os.path.join(template_path, "template.json")
                if os.path.exists(potential_json):
                    actual_template_path = potential_json
                    logger.info(f"Auto-detected template.json: {actual_template_path}")
        
        # Kiểm tra file tồn tại
        if not os.path.exists(actual_template_path):
            raise FileNotFoundError(f"Template file not found: {actual_template_path}")
        
        # Thử đọc với UTF-8 trước
        try:
            with open(actual_template_path, "r", encoding="utf-8") as f:
                template_data = json.load(f)
        except UnicodeDecodeError:
            # Nếu lỗi UTF-8, thử với encoding khác
            logger.warning(f"UTF-8 encoding failed, trying with latin-1")
            with open(actual_template_path, "r", encoding="latin-1") as f:
                template_data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in template file: {e}")
            raise
        
        return TemplateOMR(template_data)
        
    except Exception as e:
        logger.error(f"Error loading template {template_path}: {str(e)}")
        raise RuntimeError(f"Cannot load template: {str(e)}")
