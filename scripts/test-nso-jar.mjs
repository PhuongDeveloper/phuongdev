import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import AdmZip from 'adm-zip';

function patchServerConstant(classBuffer, replacement) {
  if (classBuffer.length < 12 || classBuffer.readUInt32BE(0) !== 0xcafebabe) return null;
  const constantCount = classBuffer.readUInt16BE(8);
  let offset = 10;

  for (let index = 1; index < constantCount; index += 1) {
    const tag = classBuffer[offset];
    offset += 1;
    if (tag === 1) {
      const lengthOffset = offset;
      const length = classBuffer.readUInt16BE(offset);
      offset += 2;
      const end = offset + length;
      const value = classBuffer.subarray(offset, end).toString('utf8');
      if (/^[^:\r\n]{1,60}:[a-zA-Z0-9.-]{1,253}:\d{1,5}:0(?::0)?$/.test(value)) {
        const encoded = Buffer.from(replacement, 'utf8');
        const encodedLength = Buffer.allocUnsafe(2);
        encodedLength.writeUInt16BE(encoded.length);
        return {
          previous: value,
          buffer: Buffer.concat([
            classBuffer.subarray(0, lengthOffset),
            encodedLength,
            encoded,
            classBuffer.subarray(end),
          ]),
        };
      }
      offset = end;
    } else if (tag === 3 || tag === 4) offset += 4;
    else if (tag === 5 || tag === 6) { offset += 8; index += 1; }
    else if (tag === 7 || tag === 8 || tag === 16 || tag === 19 || tag === 20) offset += 2;
    else if (tag === 9 || tag === 10 || tag === 11 || tag === 12 || tag === 17 || tag === 18) offset += 4;
    else if (tag === 15) offset += 3;
    else throw new Error(`Constant-pool tag không hỗ trợ: ${tag}`);
  }
  return null;
}

function patchJar(buffer, replacement) {
  const zip = new AdmZip(buffer);
  const entries = [];
  const previous = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !entry.entryName.endsWith('.class')) continue;
    const patched = patchServerConstant(entry.getData(), replacement);
    if (!patched) continue;
    entry.setData(patched.buffer);
    entries.push(entry.entryName);
    previous.push(patched.previous);
  }
  if (!entries.length) throw new Error('Không tìm thấy cấu hình server trong JAR.');
  return { output: zip.toBuffer(), entries, previous };
}

const templateDirectory = path.join(process.cwd(), 'private', 'nso-templates');
for (const version of ['148', '217']) {
  const template = await readFile(path.join(templateDirectory, `${version}.jar`));
  const firstValue = `Test ${version}:127.0.0.1:14444:0:0`;
  const first = patchJar(template, firstValue);
  const second = patchJar(first.output, `Test ${version}:localhost:14445:0:0`);

  assert.ok(second.previous.every((value) => value === firstValue), `JAR ${version} không lưu đúng cấu hình lần đầu`);
  assert.ok(first.output.length > 100_000, `JAR ${version} có kích thước bất thường`);
  assert.doesNotThrow(() => new AdmZip(first.output).getEntries());
  console.log(`OK ${version} x1: ${first.entries.join(', ')}, ${Math.round(first.output.length / 1024)} KB`);

  const bundle = new AdmZip();
  bundle.addFile(`Test_${version}_x1.jar`, first.output);
  for (const count of [3, 6, 12, 24]) {
    const cloneTemplate = await readFile(path.join(templateDirectory, 'clones', `${version}-x${count}.jar`));
    const clone = patchJar(cloneTemplate, firstValue);
    assert.equal(clone.entries.length, count, `JAR ${version} x${count} không vá đủ ${count} tab`);
    assert.doesNotThrow(() => new AdmZip(clone.output).getEntries());
    bundle.addFile(`Test_${version}_x${count}.jar`, clone.output);
    console.log(`OK ${version} x${count}: vá ${clone.entries.length} tab, ${Math.round(clone.output.length / 1024)} KB`);
  }
  const bundleOutput = bundle.toBuffer();
  assert.equal(new AdmZip(bundleOutput).getEntries().length, 5, `ZIP ${version} không đủ 5 JAR`);
  assert.ok(bundleOutput.length < 64 * 1024 * 1024, `ZIP ${version} vượt giới hạn Storage 64 MB`);
  console.log(`OK ${version} bundle: ${Math.round(bundleOutput.length / 1024 / 1024)} MB`);
}
