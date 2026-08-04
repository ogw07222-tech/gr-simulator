import { afterEach, describe, expect, it } from "vitest";
import { UserGuide } from "../../src/ui/UserGuide.js";
import { setLocale } from "../../src/ui/i18n.js";

describe("UserGuide", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("updates its content in place when the locale changes", () => {
    document.body.innerHTML = '<main id="root"></main><button id="trigger">open</button>';
    setLocale("ko");
    const guide = new UserGuide(document.querySelector("#root"));
    guide.open(document.querySelector("#trigger"));
    expect(document.querySelector(".user-guide h2").textContent).toBe("과학 사용자 안내서");
    setLocale("en");
    expect(document.querySelector(".user-guide h2").textContent).toBe("Scientific User Guide");
    expect(document.querySelector(".user-guide").hidden).toBe(false);
    guide.dispose();
  });
});
