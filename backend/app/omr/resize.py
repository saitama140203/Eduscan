import cv2

# Đọc ảnh gốc
img = cv2.imread('/scans/12-4-6/12-4-6.png')

# Kích thước mong muốn
new_width = 2084
new_height = 2947

# Resize với interpolation chất lượng cao
resized_img = cv2.resize(
    img,
    (new_width, new_height),
    interpolation=cv2.INTER_LANCZOS4  # hoặc cv2.INTER_CUBIC
)

# Lưu lại ảnh sắc nét /Users/lethephu/PycharmProjects/OMRChecker/inputs/12-4-6/12-4-6.png
cv2.imwrite('/scans/12-4-6/resized_sharp.jpg', resized_img)
