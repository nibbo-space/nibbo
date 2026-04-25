import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const LOGO_CID = "nibbo-logo@nibbo";

export type EmailLogoInlineResult =
  | { ok: true; imgSrc: string; attachments: { filename: string; content: Buffer; cid: string; contentDisposition: "inline" }[] }
  | { ok: false; imgSrc: null; attachments: [] };

export async function emailLogoInlinePng(): Promise<EmailLogoInlineResult> {
  try {
    const svgPath = path.join(process.cwd(), "public", "favicon.svg");
    await fs.access(svgPath);
    const content = await sharp(svgPath).resize(144, 144).png().toBuffer();
    return {
      ok: true,
      imgSrc: `cid:${LOGO_CID}`,
      attachments: [
        {
          filename: "logo.png",
          content,
          cid: LOGO_CID,
          contentDisposition: "inline",
        },
      ],
    };
  } catch {
    return { ok: false, imgSrc: null, attachments: [] };
  }
}
