from .base_skill import BaseSkill, SkillResult
from .skill_registry import registry


class OcrSkill(BaseSkill):
    name = "ocr-skill"
    description = "对图片或 PDF 页面进行 OCR 识别，提取文本内容"
    skill_type = "basic"
    input_schema = {
        "type": "object",
        "properties": {
            "image_bytes_b64": {
                "type": "string",
                "description": "图片的 base64 编码字节",
            }
        },
        "required": ["image_bytes_b64"],
    }

    async def execute(self, image_bytes_b64: str, **kwargs) -> SkillResult:
        import base64
        from app.services.ocr_service import OcrService

        image_bytes = base64.b64decode(image_bytes_b64)
        text = OcrService().extract_text(image_bytes)
        return SkillResult(success=True, data={"text": text})


registry.register(OcrSkill())
