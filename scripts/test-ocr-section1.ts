import fs from "fs";
import path from "path";
import assert from "assert";
import { processBufferOcr } from "@/lib/ocr/processor";
import { OcrFailureError } from "@/lib/ocr/extractText";

const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures", "ocr");

async function main() {
  console.log("=====================================================");
  console.log("   SECTION 1 REAL OCR FIXTURE TEST SUITE");
  console.log("=====================================================");

  // 1. Text-layer PDF SoF
  const textPdf = fs.readFileSync(path.join(FIXTURES_DIR, "sof-text-layer.pdf"));
  const resText = await processBufferOcr({
    buffer: textPdf,
    ext: "pdf",
    ports: [],
    claimId: "TEST-OCR-1",
    fileName: "sof-text-layer.pdf"
  });
  assert.strictEqual(resText.isScanned, false, "Text PDF must be detected as non-scanned text layer");
  assert(resText.extractedActivities.length >= 8, `Expected >=8 events, got ${resText.extractedActivities.length}`);
  assert.strictEqual(resText.extractedActivities[0].activityName, "Vessel arrived");
  assert.strictEqual(resText.extractedActivities[0].startTime, "2024-07-10T04:00:00.000Z");
  assert.strictEqual(resText.extractedActivities[1].activityName, "NOR tendered");
  assert.strictEqual(resText.extractedActivities[1].startTime, "2024-07-10T04:30:00.000Z");
  assert.strictEqual(resText.extractedActivities[1].stopTime, "2024-07-10T10:30:00.000Z");
  assert(resText.overallConfidencePct >= 85, `Expected confidence >= 85%, got ${resText.overallConfidencePct}`);
  console.log(`[PASS] 1. Text-layer PDF -> ${resText.extractedActivities.length} events, ${resText.overallConfidencePct}% conf`);

  // 2. Rename identical fixture to antwerp_bad.pdf -> must produce IDENTICAL output
  const badNamePdf = fs.readFileSync(path.join(FIXTURES_DIR, "antwerp_bad.pdf"));
  const resBadName = await processBufferOcr({
    buffer: badNamePdf,
    ext: "pdf",
    ports: [],
    claimId: "TEST-OCR-1",
    fileName: "antwerp_bad.pdf"
  });
  assert.strictEqual(resBadName.isScanned, resText.isScanned);
  assert.strictEqual(resBadName.overallConfidencePct, resText.overallConfidencePct);
  assert.strictEqual(resBadName.extractedActivities.length, resText.extractedActivities.length);
  for (let i = 0; i < resText.extractedActivities.length; i++) {
    assert.strictEqual(resBadName.extractedActivities[i].activityName, resText.extractedActivities[i].activityName);
    assert.strictEqual(resBadName.extractedActivities[i].startTime, resText.extractedActivities[i].startTime);
    assert.strictEqual(resBadName.extractedActivities[i].stopTime, resText.extractedActivities[i].stopTime);
  }
  console.log(`[PASS] 2. Filename independence ("antwerp_bad.pdf" == "sof-text-layer.pdf")`);

  // 3. Alternate date/time formats PDF
  const altPdf = fs.readFileSync(path.join(FIXTURES_DIR, "sof-alt-dates.pdf"));
  const resAlt = await processBufferOcr({
    buffer: altPdf,
    ext: "pdf",
    ports: [],
    claimId: "TEST-OCR-ALT",
    fileName: "sof-alt-dates.pdf"
  });
  assert(resAlt.extractedActivities.length >= 5, `Expected >=5 events for alt dates, got ${resAlt.extractedActivities.length}`);
  assert.strictEqual(resAlt.extractedActivities[0].startTime, "2024-07-10T06:00:00.000Z");
  assert.strictEqual(resAlt.extractedActivities[1].startTime, "2024-07-10T07:00:00.000Z");
  assert.strictEqual(resAlt.extractedActivities[1].stopTime, "2024-07-10T13:00:00.000Z");
  assert.strictEqual(resAlt.extractedActivities[2].startTime, "2024-07-11T08:00:00.000Z");
  assert.strictEqual(resAlt.extractedActivities[2].stopTime, "2024-07-11T09:30:00.000Z");
  console.log(`[PASS] 3. Alternate date/time PDF -> ${resAlt.extractedActivities.length} events`);

  // 4. Scanned PNG SoF
  const pngBuf = fs.readFileSync(path.join(FIXTURES_DIR, "sof-scanned.png"));
  const resPng = await processBufferOcr({
    buffer: pngBuf,
    ext: "png",
    ports: [],
    claimId: "TEST-OCR-PNG",
    fileName: "sof-scanned.png"
  });
  assert.strictEqual(resPng.isScanned, true);
  assert(resPng.extractedActivities.length >= 5, `Expected >=5 PNG events, got ${resPng.extractedActivities.length}`);
  assert(resPng.overallConfidencePct >= 75, `Expected crisp PNG confidence >= 75%, got ${resPng.overallConfidencePct}%`);
  console.log(`[PASS] 4. Scanned PNG SoF -> ${resPng.extractedActivities.length} events, ${resPng.overallConfidencePct}% conf`);

  // 5. Skewed / low-quality scan -> expect low confidence (< 80%) and low_confidence discrepancy
  const skewedBuf = fs.readFileSync(path.join(FIXTURES_DIR, "sof-skewed-low.png"));
  const resSkewed = await processBufferOcr({
    buffer: skewedBuf,
    ext: "png",
    ports: [],
    claimId: "TEST-OCR-LOW",
    fileName: "sof-skewed-low.png"
  });
  assert(resSkewed.extractedActivities.length >= 2, `Expected >=2 events from skewed scan, got ${resSkewed.extractedActivities.length}`);
  assert(
    resSkewed.overallConfidencePct < 80,
    `Expected skewed scan overall confidence < 80%, got ${resSkewed.overallConfidencePct}%`
  );
  assert(
    resSkewed.flaggedDiscrepancies.some((d) => d.type === "low_confidence"),
    "Expected low_confidence discrepancy on skewed scan"
  );
  console.log(`[PASS] 5. Skewed PNG -> ${resSkewed.extractedActivities.length} events, ${resSkewed.overallConfidencePct}% conf (< 80%), low_confidence flagged`);

  // 6. Blank PDF -> clean OcrFailureError
  const blankBuf = fs.readFileSync(path.join(FIXTURES_DIR, "sof-blank.pdf"));
  let blankFailedCleanly = false;
  try {
    await processBufferOcr({ buffer: blankBuf, ext: "pdf", ports: [], claimId: "TEST-BLANK", fileName: "sof-blank.pdf" });
  } catch (err: any) {
    assert(err instanceof OcrFailureError, `Expected OcrFailureError on blank PDF, got ${err}`);
    blankFailedCleanly = true;
    console.log(`[PASS] 6. Blank PDF cleanly rejected (${err.code}): ${err.message}`);
  }
  assert(blankFailedCleanly, "Blank PDF must reject via OcrFailureError");

  // 7. Corrupt PDF -> clean OcrFailureError
  const corruptBuf = fs.readFileSync(path.join(FIXTURES_DIR, "sof-corrupt.pdf"));
  let corruptFailedCleanly = false;
  try {
    await processBufferOcr({ buffer: corruptBuf, ext: "pdf", ports: [], claimId: "TEST-CORRUPT", fileName: "sof-corrupt.pdf" });
  } catch (err: any) {
    assert(err instanceof OcrFailureError, `Expected OcrFailureError on corrupt PDF, got ${err}`);
    corruptFailedCleanly = true;
    console.log(`[PASS] 7. Corrupt PDF cleanly rejected (${err.code}): ${err.message}`);
  }
  assert(corruptFailedCleanly, "Corrupt PDF must reject via OcrFailureError");

  console.log("ALL SECTION 1 REAL OCR TESTS PASSED (7/7)!");
}

main();
