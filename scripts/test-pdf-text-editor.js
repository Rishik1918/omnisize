import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getDocumentProxy } from 'unpdf';
import assert from 'assert';

console.log('--- STARTING PDF TEXT EDITOR & UNDO/REDO VERIFICATION ---');

async function runTest() {
  // 1. Create a donor PDF with known text
  console.log('Step 1: Creating test PDF with baseline text...');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([600, 400]);

  const originalText = 'Invoice Total: $500.00 USD';
  page.drawText(originalText, {
    x: 60,
    y: 320,
    size: 18,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  const pdfBytes = await doc.save();

  // 2. Extract text items using unpdf proxy
  console.log('Step 2: Extracting text items from PDF page...');
  const proxy = await getDocumentProxy(pdfBytes.slice());
  const page1 = await proxy.getPage(1);
  const textContent = await page1.getTextContent();

  assert(textContent.items.length > 0, 'Should extract at least 1 text item');
  const firstItem = textContent.items[0];
  console.log(`Extracted text item: "${firstItem.str}" at (${firstItem.transform[4]}, ${firstItem.transform[5]})`);
  assert(firstItem.str.includes('Invoice Total'), 'Should contain Invoice Total text');

  // 3. Simulate Undo / Redo History Stack
  console.log('Step 3: Testing Undo/Redo State History Stack...');
  const history = [];
  let historyIndex = 0;

  // Initial state
  const state0 = {
    modifiedText: 'Invoice Total: $500.00 USD',
  };
  history.push(state0);

  // Edit 1: change to $1,250.00 USD
  const state1 = {
    modifiedText: 'Invoice Total: $1,250.00 USD',
  };
  history.push(state1);
  historyIndex = 1;
  assert.strictEqual(history[historyIndex].modifiedText, 'Invoice Total: $1,250.00 USD');
  console.log('  State after edit:', history[historyIndex].modifiedText);

  // Undo
  historyIndex--;
  assert.strictEqual(history[historyIndex].modifiedText, 'Invoice Total: $500.00 USD');
  console.log('  State after Undo:', history[historyIndex].modifiedText);

  // Redo
  historyIndex++;
  assert.strictEqual(history[historyIndex].modifiedText, 'Invoice Total: $1,250.00 USD');
  console.log('  State after Redo:', history[historyIndex].modifiedText);

  // 4. Apply text replacement onto PDF (erase old bounds, write new text)
  console.log('Step 4: Applying in-place text replacement to PDF...');
  const editDoc = await PDFDocument.load(pdfBytes.slice());
  const editPage = editDoc.getPage(0);
  const editFont = await editDoc.embedFont(StandardFonts.Helvetica);

  const x = firstItem.transform[4];
  const y = firstItem.transform[5];
  const width = firstItem.width;
  const height = 18;
  const newText = 'Invoice Total: $1,250.00 USD';

  // Erase old text bounding box
  editPage.drawRectangle({
    x: Math.max(0, x - 2),
    y: Math.max(0, y - 4),
    width: width + 10,
    height: height + 8,
    color: rgb(1, 1, 1),
  });

  // Draw replacement text
  editPage.drawText(newText, {
    x,
    y,
    size: 18,
    font: editFont,
    color: rgb(0, 0, 0),
  });

  const editedBytes = await editDoc.save();

  // 5. Verify the edited PDF contains the replacement text
  console.log('Step 5: Verifying replacement text in the generated PDF...');
  const editedProxy = await getDocumentProxy(new Uint8Array(editedBytes));
  const editedPage1 = await editedProxy.getPage(1);
  const editedContent = await editedPage1.getTextContent();
  const allStrs = editedContent.items.map((i) => i.str).join(' ');

  console.log('All text strings in edited PDF:', allStrs);
  assert(allStrs.includes('$1,250.00'), 'Edited PDF must contain the replacement text "$1,250.00"');

  console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

runTest().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
