import pandas as pd
import re
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_score(question):
    # 12 câu trắc nghiệm q1-q12 mỗi câu 0.5
    if re.match(r'^q\d+$', question):
        return 0.5
    # Các câu đúng/sai, ví dụ: 12_a, 12_b, 12_c, 12_d, 13_a-d, v.v.
    elif re.match(r'^(1[2-6])_[a-d]$', question):
        return 0.5
    # Các câu điền số, col
    elif re.match(r'^\d+_col\d+$', question):
        return 1.0
    else:
        return 1.0  # Còn lại mặc định 1 điểm

def add_score_column_and_scale_to_10(data):
    df = pd.DataFrame(data)
    df["RawScore"] = df["Question"].apply(get_score)
    total_raw = df["RawScore"].sum()
    df["Score"] = df["RawScore"] * 10 / total_raw
    # Làm tròn tới 3 số lẻ (nếu cần)
    df["Score"] = df["Score"].round(3)
    return df[["Question", "Answer", "Score"]]




data_123 = {
    "Question": [
        "q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12",
        "12_a","12_b","12_c","12_d","13_a","13_b","13_c","13_d",
        "14_a","14_b","14_c","15_d","16_a","16_b","16_c","16_d",
        "17_col1","17_col2","17_col3","17_col4",
        "18_col1","18_col2","18_col3","18_col4",
        "19_col1","19_col2","19_col3","19_col4",
        "20_col1","20_col2","20_col3","20_col4",
        "21_col1","21_col2","21_col3","21_col4",
        "22_col1","22_col2","22_col3","22_col4"
    ],
    "Answer": [
        "A","B","D","C","D","B","A","C","B","D","C","B",
        "T","F","F","T","T","F","T","F",
        "T","T","F","F","T","F","T","T",
        "2",",","4","1",
        "4",",","2","2",
        "2",",","6","9",
        "1","0",",","0",
        "6",",","1","1",
        "1",",","4","7"
    ]
}

data_456 = {
    "Question": [
        "q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12",
        "12_a","12_b","12_c","12_d","13_a","13_b","13_c","13_d",
        "14_a","14_b","14_c","15_d","16_a","16_b","16_c","16_d",
        "17_col1","17_col2","17_col3","17_col4",
        "18_col1","18_col2","18_col3","18_col4",
        "19_col1","19_col2","19_col3","19_col4",
        "20_col1","20_col2","20_col3","20_col4",
        "21_col1","21_col2","21_col3","21_col4",
        "22_col1","22_col2","22_col3","22_col4"
    ],
    "Answer": [
        "C","D","A","B","A","C","D","B","D","B","D","A",
        "F","T","T","F","F","F","T","T",
        "T","F","T","T","F","T","T","F",
        "7",",","8","3",
        "5",",","7","2",
        "1",",","8","2",
        "8","9",",","1",
        "2",",","5","7",
        "9",",","0","6"
    ]
}

data_777 = {
    "Question": [
        "q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12",
        "12_a","12_b","12_c","12_d","13_a","13_b","13_c","13_d",
        "14_a","14_b","14_c","15_d","16_a","16_b","16_c","16_d",
        "17_col1","17_col2","17_col3","17_col4",
        "18_col1","18_col2","18_col3","18_col4",
        "19_col1","19_col2","19_col3","19_col4",
        "20_col1","20_col2","20_col3","20_col4",
        "21_col1","21_col2","21_col3","21_col4",
        "22_col1","22_col2","22_col3","22_col4"
    ],
    "Answer": [
        "A","B","C","C","C","B","C","A","C","A","B","D",
        "F","F","T","T","T","T","F","F",
        "F","T","T","F","T","T","F","T",
        "2",",","4","1",
        "4",",","2","2",
        "5",",","7","8",
        "1","2",",","3",
        "3",",","6","4",
        "7",",","3","5"
    ]
}

df_123 = add_score_column_and_scale_to_10(data_123)
df_456 = add_score_column_and_scale_to_10(data_456)
df_777 = add_score_column_and_scale_to_10(data_777)


with pd.ExcelWriter("all_answer_keys.xlsx") as writer:
    df_123.to_excel(writer, sheet_name="123", index=False)
    df_456.to_excel(writer, sheet_name="456", index=False)
    df_777.to_excel(writer, sheet_name="777", index=False)

logging.info("Đã tạo file all_answer_keys.xlsx với 3 mã đề.")
