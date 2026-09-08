import re, sys
import pymupdf

HANGUL = re.compile(r'[가-힣㄰-㆏]')

INSTRUCTION = "Choose the correct word from the Word Box and complete each sentence."

def strip(src, dst):
    doc = pymupdf.open(src)
    for page in doc:
        instr_rect = None
        bogi_rect = None
        targets = []
        for b in page.get_text("dict")["blocks"]:
            if b["type"] != 0:
                continue
            for line in b["lines"]:
                for s in line["spans"]:
                    t = s["text"]
                    if not HANGUL.search(t):
                        continue
                    r = pymupdf.Rect(s["bbox"])
                    if "우리말" in t:
                        instr_rect = pymupdf.Rect(r)
                    elif t.strip() == "[보기]":
                        bogi_rect = pymupdf.Rect(r)
                    targets.append(r)

        for r in targets:
            page.add_redact_annot(r + (-1, -1.2, 1, 1.2))
        if targets:
            page.apply_redactions(
                images=pymupdf.PDF_REDACT_IMAGE_NONE,
                graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
                text=pymupdf.PDF_REDACT_TEXT_REMOVE,
            )

        if instr_rect:
            box = pymupdf.Rect(instr_rect.x0, instr_rect.y0 - 2, page.rect.x1 - 30, instr_rect.y1 + 6)
            rc = page.insert_textbox(box, INSTRUCTION, fontname="hebo", fontsize=10.5,
                                     color=(0, 0, 0), align=0)
            assert rc >= 0, f"instruction insert failed: {rc}"
        if bogi_rect:
            box = pymupdf.Rect(bogi_rect.x0 - 1, bogi_rect.y0 - 1, bogi_rect.x0 + 64, bogi_rect.y1 + 6)
            rc = page.insert_textbox(box, "Word Box", fontname="hebo", fontsize=10.5,
                                     color=(0, 0, 0), align=0)
            assert rc >= 0, f"word box insert failed: {rc}"

    doc.save(dst, garbage=4, deflate=True)
    doc.close()
    print("wrote", dst)

if __name__ == "__main__":
    strip(sys.argv[1], sys.argv[2])
