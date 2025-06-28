import pandas as pd
import re
import csv
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def group_answers(answer_dict):
    """
    Gộp các trường _colN thành một trường tổng hợp: 17_col1, 17_col2, ... => 17: '2,41' (v.v.)
    """
    from collections import defaultdict
    grouped = defaultdict(list)
    normal = {}
    for k, v in answer_dict.items():
        m = re.match(r"^([^\_]+)_col(\d+)$", k)
        if m:
            prefix = m.group(1)
            idx = int(m.group(2))
            grouped[prefix].append((idx, v))
        else:
            normal[k] = v
    for prefix, lst in grouped.items():
        lst_sorted = [v for idx, v in sorted(lst, key=lambda x: x[0])]
        merged = ''.join(lst_sorted)
        normal[prefix] = merged
    return normal

def score_omr_result(student_results, answer_key):
    correct, total = 0, 0
    details = []
    for qid, ans in answer_key.items():
        stu_ans = student_results.get(qid, None)
        is_correct = (stu_ans == ans)
        details.append((qid, stu_ans, ans, is_correct))
        total += 1
        if is_correct:
            correct += 1
    return correct, total, details

def save_scored_csv(details, score, total, sbd="unknown", ma_de="unknown"):
    out_path = f"sbd_{sbd}_made_{ma_de}_scored.csv"
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["sbd", "ma_de"])
        writer.writerow([sbd, ma_de])
        writer.writerow([])
        writer.writerow(["Question", "StudentAnswer", "CorrectAnswer", "Result"])
        for qid, stu_ans, true_ans, is_correct in details:
            writer.writerow([qid, stu_ans, true_ans, "Correct" if is_correct else "Wrong"])
        writer.writerow([])
        writer.writerow(["TotalScore", score, total])
    logging.info(f"Đã lưu file: {out_path}")

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
        return "".join(sorted_values)
    return "unknown"

def omr_batch_scoring_pipeline(file_result, answer_key_excel):
    df = pd.read_csv(file_result)
    student_answers = {str(row["Question"]).strip(): str(row["Answer"]).strip() for _, row in df.iterrows()}

    # Tự động trích xuất sbd và mã đề
    sbd = extract_special_code(student_answers, "sbd")
    ma_de = extract_special_code(student_answers, "mdt")
    if ma_de == "unknown":
        raise ValueError("Không tìm thấy mã đề trong file kết quả (tìm các trường 'mdt_*')")
    student_answers = group_answers(student_answers)

    # Đọc đáp án mã đề
    answer_keys = pd.read_excel(answer_key_excel, sheet_name=None)
    if str(ma_de) not in answer_keys:
        raise ValueError(f"Mã đề {ma_de} không có trong file đáp án!")
    answer_key = answer_keys[str(ma_de)]
    answer_key = {str(row["Question"]).strip(): str(row["Answer"]).strip() for _, row in answer_key.iterrows()}
    answer_key = group_answers(answer_key)

    # Chấm điểm
    score, total, details = score_omr_result(student_answers, answer_key)
    save_scored_csv(details, score, total, sbd=sbd, ma_de=ma_de)

if __name__ == "__main__":
    batch_file = "/root/projects/Eduscan/OMRChecker/scans/12-4-6_0P/results_csv/12-4-6_omr.csv"
    answer_key_excel = "/root/projects/Eduscan/OMRChecker/answers/12-4-6_0P/all_answer_keys.xlsx"
    omr_batch_scoring_pipeline(batch_file, answer_key_excel)
