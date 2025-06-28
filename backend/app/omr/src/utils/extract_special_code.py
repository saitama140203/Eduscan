import re

def extract_special_code(student_answers, prefix):
    # Lấy tất cả trường dạng <prefix>_*, nối liền giá trị (theo số tăng dần, ví dụ: 1,2,3 -> "789")
    items = []
    for k, v in student_answers.items():
        m = re.match(rf"{prefix}_(\d+)", k, re.IGNORECASE)
        if m:
            idx = int(m.group(1))
            items.append((idx, v))
    if items:
        sorted_values = [v for idx, v in sorted(items, key=lambda x: x[0])]
        #   print(sorted_values)
        return "".join(sorted_values)
    return "unknown"