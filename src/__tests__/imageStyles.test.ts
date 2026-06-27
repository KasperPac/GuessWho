import { IMAGE_STYLE_CONFIGS } from "@/lib/image-generation/styles";
import type { ImageStyle } from "@/types/game";

const EXPECTED_STYLES: ImageStyle[] = [
  "cartoon",
  "realistic",
  "simpsons",
  "pixar",
  "watercolour",
  "anime",
  "lego",
  "southpark",
];

describe("IMAGE_STYLE_CONFIGS", () => {
  it("contains exactly 8 styles", () => {
    expect(Object.keys(IMAGE_STYLE_CONFIGS).length).toBe(8);
  });

  for (const style of EXPECTED_STYLES) {
    describe(`style: ${style}`, () => {
      it("has a non-empty label", () => {
        expect(IMAGE_STYLE_CONFIGS[style].label.length).toBeGreaterThan(0);
      });

      it("has a non-empty description", () => {
        expect(IMAGE_STYLE_CONFIGS[style].description.length).toBeGreaterThan(0);
      });

      it("has a non-empty promptModifier", () => {
        expect(IMAGE_STYLE_CONFIGS[style].promptModifier.length).toBeGreaterThan(0);
      });
    });
  }
});
