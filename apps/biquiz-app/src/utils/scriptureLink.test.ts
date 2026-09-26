import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { scriptureUrl } from "./scriptureLink.ts"

describe("scriptureUrl", () => {
  it("links a French reference to its chapter and first verse", () => {
    assert.equal(
      scriptureUrl("Esdras 10:10, 11", "fr"),
      "https://wol.jw.org/fr/wol/b/r30/lp-f/nwtsty/15/10#v=15:10:10",
    )
  })

  it("links an English reference", () => {
    assert.equal(
      scriptureUrl("Judges 16:13, 18", "en"),
      "https://wol.jw.org/en/wol/b/r1/lp-e/nwtsty/7/16#v=7:16:13",
    )
  })

  it("uses the first chapter when several are cited", () => {
    assert.equal(
      scriptureUrl("Genèse 14:12 ; 24:67", "fr"),
      "https://wol.jw.org/fr/wol/b/r30/lp-f/nwtsty/1/14#v=1:14:12",
    )
  })

  it("links a numbered book and a chapter range", () => {
    assert.equal(scriptureUrl("2 Timothée 1:2, 5", "fr")?.includes("/55/1#v=55:1:2"), true)
    assert.equal(
      scriptureUrl("Matthieu 5-7", "fr"),
      "https://wol.jw.org/fr/wol/b/r30/lp-f/nwtsty/40/5",
    )
  })

  it("links a chapter without a verse", () => {
    assert.equal(scriptureUrl("Juges 16", "fr"), "https://wol.jw.org/fr/wol/b/r30/lp-f/nwtsty/7/16")
  })

  it("returns null when there is no recognisable book", () => {
    assert.equal(scriptureUrl("Bible", "fr"), null)
    assert.equal(scriptureUrl("", "en"), null)
    assert.equal(scriptureUrl("Esdras", "fr"), null)
  })
})
