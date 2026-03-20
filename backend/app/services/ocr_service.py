class OcrService:
    def __init__(self):
        self._ocr = None

    def _get_ocr(self):
        if self._ocr is None:
            try:
                from paddleocr import PaddleOCR
                self._ocr = PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)
            except ImportError:
                raise RuntimeError("paddleocr not installed. Run: pip install paddleocr")
        return self._ocr

    def extract_text_from_image_bytes(self, image_bytes: bytes) -> str:
        import numpy as np
        import cv2
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        ocr = self._get_ocr()
        result = ocr.ocr(img, cls=True)
        lines = []
        for page in result:
            if page:
                for line in page:
                    lines.append(line[1][0])
        return "\n".join(lines)
