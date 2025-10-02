import { describe, it, expect } from "vitest";
import { jitCSS } from "../src/lib/runtime/style";

describe("🎯 Fractional Sizing Utilities", () => {
  describe("Width Fractions", () => {
    it("should generate width utilities with common fractions", () => {
      const html = `
        <div class="w-1/2 w-1/3 w-2/3 w-1/4 w-3/4">
          Common fractions
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".w-1\\/2{width:50%;}");
      expect(css).toContain(".w-1\\/3{width:33.33333333333333%;}");
      expect(css).toContain(".w-2\\/3{width:66.66666666666666%;}");
      expect(css).toContain(".w-1\\/4{width:25%;}");
      expect(css).toContain(".w-3\\/4{width:75%;}");
    });

    it("should generate width utilities with fifths", () => {
      const html = `
        <div class="w-1/5 w-2/5 w-3/5 w-4/5">
          Fifths
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".w-1\\/5{width:20%;}");
      expect(css).toContain(".w-2\\/5{width:40%;}");
      expect(css).toContain(".w-3\\/5{width:60%;}");
      expect(css).toContain(".w-4\\/5{width:80%;}");
    });

    it("should generate width utilities with sixths", () => {
      const html = `
        <div class="w-1/6 w-5/6">
          Sixths
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".w-1\\/6{width:16.666666666666664%;}");
      expect(css).toContain(".w-5\\/6{width:83.33333333333334%;}");
    });

    it("should generate width utilities with twelfths", () => {
      const html = `
        <div class="w-1/12 w-5/12 w-7/12 w-11/12">
          Twelfths
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".w-1\\/12{width:8.333333333333332%;}");
      expect(css).toContain(".w-5\\/12{width:41.66666666666667%;}");
      expect(css).toContain(".w-7\\/12{width:58.333333333333336%;}");
      expect(css).toContain(".w-11\\/12{width:91.66666666666666%;}");
    });

    it("should handle full width fraction", () => {
      const html = `<div class="w-1/1 w-2/2 w-4/4">Full width</div>`;

      const css = jitCSS(html);

      expect(css).toContain(".w-1\\/1{width:100%;}");
      expect(css).toContain(".w-2\\/2{width:100%;}");
      expect(css).toContain(".w-4\\/4{width:100%;}");
    });
  });

  describe("Height Fractions", () => {
    it("should generate height utilities with common fractions", () => {
      const html = `
        <div class="h-1/2 h-1/3 h-2/3 h-1/4 h-3/4">
          Common fractions
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".h-1\\/2{height:50%;}");
      expect(css).toContain(".h-1\\/3{height:33.33333333333333%;}");
      expect(css).toContain(".h-2\\/3{height:66.66666666666666%;}");
      expect(css).toContain(".h-1\\/4{height:25%;}");
      expect(css).toContain(".h-3\\/4{height:75%;}");
    });

    it("should generate height utilities with fifths", () => {
      const html = `
        <div class="h-1/5 h-2/5 h-3/5 h-4/5">
          Fifths
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".h-1\\/5{height:20%;}");
      expect(css).toContain(".h-2\\/5{height:40%;}");
      expect(css).toContain(".h-3\\/5{height:60%;}");
      expect(css).toContain(".h-4\\/5{height:80%;}");
    });

    it("should generate height utilities with sixths", () => {
      const html = `<div class="h-1/6 h-5/6">Sixths</div>`;

      const css = jitCSS(html);

      expect(css).toContain(".h-1\\/6{height:16.666666666666664%;}");
      expect(css).toContain(".h-5\\/6{height:83.33333333333334%;}");
    });
  });

  describe("Min/Max Width Fractions", () => {
    it("should generate min-width utilities with fractions", () => {
      const html = `
        <div class="min-w-1/2 min-w-1/3 min-w-3/4">
          Min width fractions
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".min-w-1\\/2{min-width:50%;}");
      expect(css).toContain(".min-w-1\\/3{min-width:33.33333333333333%;}");
      expect(css).toContain(".min-w-3\\/4{min-width:75%;}");
    });

    it("should generate max-width utilities with fractions", () => {
      const html = `
        <div class="max-w-1/2 max-w-2/3 max-w-3/4">
          Max width fractions
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".max-w-1\\/2{max-width:50%;}");
      expect(css).toContain(".max-w-2\\/3{max-width:66.66666666666666%;}");
      expect(css).toContain(".max-w-3\\/4{max-width:75%;}");
    });
  });

  describe("Min/Max Height Fractions", () => {
    it("should generate min-height utilities with fractions", () => {
      const html = `
        <div class="min-h-1/2 min-h-1/4 min-h-3/5">
          Min height fractions
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".min-h-1\\/2{min-height:50%;}");
      expect(css).toContain(".min-h-1\\/4{min-height:25%;}");
      expect(css).toContain(".min-h-3\\/5{min-height:60%;}");
    });

    it("should generate max-height utilities with fractions", () => {
      const html = `
        <div class="max-h-1/2 max-h-2/5 max-h-5/6">
          Max height fractions
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".max-h-1\\/2{max-height:50%;}");
      expect(css).toContain(".max-h-2\\/5{max-height:40%;}");
      expect(css).toContain(".max-h-5\\/6{max-height:83.33333333333334%;}");
    });
  });

  describe("Fractions with Variants", () => {
    it("should work with responsive variants", () => {
      const html = `
        <div class="sm:w-1/2 md:w-2/3 lg:w-3/4">
          Responsive fractions
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain("@media (min-width:640px){.sm\\:w-1\\/2{width:50%;}");
      expect(css).toContain("@media (min-width:768px){.md\\:w-2\\/3{width:66.66666666666666%;}");
      expect(css).toContain("@media (min-width:1024px){.lg\\:w-3\\/4{width:75%;}");
    });

    it("should work with container query variants", () => {
      const html = `
        <div class="@sm:w-1/2 @md:w-2/3 @lg:h-3/4">
          Container query fractions
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain("@container (min-width:24rem){.\\@sm\\:w-1\\/2{width:50%;}");
      expect(css).toContain("@container (min-width:28rem){.\\@md\\:w-2\\/3{width:66.66666666666666%;}");
      expect(css).toContain("@container (min-width:32rem){.\\@lg\\:h-3\\/4{height:75%;}");
    });

    it("should work with hover and focus variants", () => {
      const html = `
        <div class="hover:w-1/2 focus:w-2/3">
          Hover and focus fractions
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".hover\\:w-1\\/2:hover{width:50%;}");
      expect(css).toContain(".focus\\:w-2\\/3:focus{width:66.66666666666666%;}");
    });

    it("should work with dark mode variant", () => {
      const html = `
        <div class="dark:w-1/2 dark:h-3/4">
          Dark mode fractions
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain("@media (prefers-color-scheme: dark){.dark\\:w-1\\/2{width:50%;}");
      expect(css).toContain("@media (prefers-color-scheme: dark){.dark\\:h-3\\/4{height:75%;}");
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero numerator", () => {
      const html = `<div class="w-0/4 h-0/5">Zero fractions</div>`;

      const css = jitCSS(html);

      expect(css).toContain(".w-0\\/4{width:0%;}");
      expect(css).toContain(".h-0\\/5{height:0%;}");
    });

    it("should not generate CSS for division by zero", () => {
      const html = `<div class="w-1/0 h-2/0">Invalid fractions</div>`;

      const css = jitCSS(html);

      expect(css).not.toContain("w-1\\/0");
      expect(css).not.toContain("h-2\\/0");
    });

    it("should not generate CSS for invalid fractions", () => {
      const html = `<div class="w-a/2 h-1/b">Invalid numeric fractions</div>`;

      const css = jitCSS(html);

      expect(css).not.toContain("w-a\\/2");
      expect(css).not.toContain("h-1\\/b");
    });

    it("should handle decimal fractions", () => {
      const html = `<div class="w-1.5/3 h-2.5/5">Decimal fractions</div>`;

      const css = jitCSS(html);

      expect(css).toContain(".w-1\\.5\\/3{width:50%;}");
      expect(css).toContain(".h-2\\.5\\/5{height:50%;}");
    });
  });

  describe("Mixed Sizing", () => {
    it("should work alongside numeric sizing utilities", () => {
      const html = `
        <div class="w-1/2 w-64 h-3/4 h-32">
          Mixed sizing
        </div>
      `;

      const css = jitCSS(html);

      // Fractions
      expect(css).toContain(".w-1\\/2{width:50%;}");
      expect(css).toContain(".h-3\\/4{height:75%;}");

      // Numeric (using spacing scale)
      expect(css).toContain(".w-64{width:calc(");
      expect(css).toContain(".h-32{height:calc(");
    });

    it("should work alongside keyword sizing utilities", () => {
      const html = `
        <div class="w-1/2 w-full w-auto h-3/4 h-screen">
          Mixed with keywords
        </div>
      `;

      const css = jitCSS(html);

      expect(css).toContain(".w-1\\/2{width:50%;}");
      expect(css).toContain(".w-full{width:100%;}");
      expect(css).toContain(".w-auto{width:auto;}");
      expect(css).toContain(".h-3\\/4{height:75%;}");
      expect(css).toContain(".h-screen{height:100dvh;}");
    });
  });

  describe("Common Layout Patterns", () => {
    it("should support two-column layouts", () => {
      const html = `
        <div class="w-1/2">50% width</div>
      `;

      const css = jitCSS(html);
      expect(css).toContain(".w-1\\/2{width:50%;}");
    });

    it("should support three-column layouts", () => {
      const html = `
        <div class="w-1/3 w-2/3">Three columns</div>
      `;

      const css = jitCSS(html);
      expect(css).toContain(".w-1\\/3{width:33.33333333333333%;}");
      expect(css).toContain(".w-2\\/3{width:66.66666666666666%;}");
    });

    it("should support four-column layouts", () => {
      const html = `
        <div class="w-1/4 w-2/4 w-3/4">Four columns</div>
      `;

      const css = jitCSS(html);
      expect(css).toContain(".w-1\\/4{width:25%;}");
      expect(css).toContain(".w-2\\/4{width:50%;}");
      expect(css).toContain(".w-3\\/4{width:75%;}");
    });

    it("should support twelve-column grid system", () => {
      const html = `
        <div class="w-1/12 w-2/12 w-3/12 w-4/12 w-6/12 w-8/12 w-9/12 w-10/12 w-11/12 w-12/12">
          Twelve column grid
        </div>
      `;

      const css = jitCSS(html);
      expect(css).toContain(".w-1\\/12{width:8.333333333333332%;}");
      expect(css).toContain(".w-3\\/12{width:25%;}");
      expect(css).toContain(".w-6\\/12{width:50%;}");
      expect(css).toContain(".w-12\\/12{width:100%;}");
    });
  });
});
