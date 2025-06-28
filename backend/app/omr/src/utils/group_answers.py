import re
from collections import defaultdict

def group_answers(answer_dict):
    """
    Gộp các trường _colN thành một trường tổng hợp: 17_col1, 17_col2, ... => 17: '2,41' (v.v.)
    """

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

def group_scores(score_dict):
    """
    Gộp điểm các trường _colN thành điểm tổng hợp của nhóm.
    Ví dụ: 17_col1, 17_col2, 17_col3... => 17: sum([score của 17_col1, ...])
    """
    from collections import defaultdict
    grouped = defaultdict(list)
    normal = {}
    for k, v in score_dict.items():
        m = re.match(r"^([^\_]+)_col(\d+)$", k)
        if m:
            prefix = m.group(1)
            idx = int(m.group(2))
            grouped[prefix].append((idx, v))
        else:
            normal[k] = v
    for prefix, lst in grouped.items():
        # Tổng điểm của các ô trong nhóm
        total_score = sum([v for idx, v in lst])
        normal[prefix] = total_score
    return normal
