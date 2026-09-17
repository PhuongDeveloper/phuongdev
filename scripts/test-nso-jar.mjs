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
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !entry.entryName.endsWith('.class')) continue;
    const patched = patchServerConstant(entry.getData(), replacement);
    if (!patched) continue;
    entry.setData(patched.buffer);
    return { output: zip.toBuffer(), entry: entry.entryName, previous: patched.previous };
  }
  throw new Error('Không tìm thấy cấu hình server trong JAR.');
}

const templateDirectory = path.join(process.cwd(), 'private', 'nso-templates');
for (const version of ['148', '217']) {
  const template = await readFile(path.join(templateDirectory, `${version}.jar`));
  const firstValue = `Test ${version}:127.0.0.1:14444:0:0`;
  const first = patchJar(template, firstValue);
  const second = patchJar(first.output, `Test ${version}:localhost:14445:0:0`);

  assert.equal(second.previous, firstValue, `JAR ${version} không lưu đúng cấu hình lần đầu`);
  assert.ok(first.output.length > 100_000, `JAR ${version} có kích thước bất thường`);
  assert.doesNotThrow(() => new AdmZip(first.output).getEntries());
  console.log(`OK ${version}: ${first.entry}, ${Math.round(first.output.length / 1024)} KB`);
}

