import unicodedata

def initials_emailify(name):
    def get_ascii_char(c):
        # Đặc biệt đổi đ/Đ thành d/D
        if c.lower() == 'đ':
            return 'd'
        # Bỏ dấu các ký tự Unicode khác
        return unicodedata.normalize('NFD', c)[0].lower()
    # Lấy ký tự đầu mỗi từ, bỏ dấu
    return ''.join(get_ascii_char(word[0]) for word in name.strip().split() if word)
print(initials_emailify("Trần Đuốc Toản"))     # tdt
print(initials_emailify("Đặng Thị Hào"))       # dth
print(initials_emailify("Nguyễn Văn Phú"))     # nvp
