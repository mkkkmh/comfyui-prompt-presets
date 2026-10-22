class CLIPTextEncodeWithPresets:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "text": ("STRING", {"multiline": True, "dynamicPrompts": True}),
                "clip": ("CLIP", ),
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    FUNCTION = "encode"
    CATEGORY = "conditioning"

    def encode(self, clip, text):
        tokens = clip.tokenize(text)
        # Kompatibel dengan versi ComfyUI lama maupun terbaru
        if hasattr(clip, "encode_from_tokens_scheduled"):
            return (clip.encode_from_tokens_scheduled(tokens), )
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        return ([[cond, {"pooled_output": pooled}]], )

NODE_CLASS_MAPPINGS = {
    "CLIPTextEncodeWithPresets": CLIPTextEncodeWithPresets
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CLIPTextEncodeWithPresets": "CLIP Text Encode (With Presets)"
}