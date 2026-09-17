import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import AdmZip from 'adm-zip';

const templateDirectory = path.join(process.cwd(), 'private', 'nso-templates');
const allowedTemplates = new Set(['148.jar', '217.jar']);

type PatchedConstant = { previous: string; buffer: Buffer };

function patchServerConstant(classBuffer: Buffer, replacement: string): PatchedConstant | null {
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
        if (encoded.length > 65535) throw new Error('Cấu hình server quá dài cho class Java.');
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
    else throw new Error(`Class Java chứa constant-pool tag không hỗ trợ: ${tag}.`);
    if (offset > classBuffer.length) throw new Error('Class Java bị hỏng hoặc không đầy đủ.');
  }
  return null;
}

export function safeJarFilePart(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const safe = normalized.replace(/đ/gi, (letter) => letter === 'Đ' ? 'D' : 'd')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[_ .-]+|[_ .-]+$/g, '')
    .slice(0, 48);
  return safe || 'NinjaSchool';
}

export async function createNsoJar(templateFile: string, serverData: string) {
  if (!allowedTemplates.has(templateFile)) throw new Error('Template JAR không được phép sử dụng.');
  const templatePath = path.join(templateDirectory, templateFile);
  if (!templatePath.startsWith(`${templateDirectory}${path.sep}`)) throw new Error('Đường dẫn template không hợp lệ.');

  const zip = new AdmZip(await readFile(templatePath));
  let patchedEntry: string | null = null;
  let previousValue: string | null = null;

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !entry.entryName.endsWith('.class')) continue;
    const result = patchServerConstant(entry.getData(), serverData);
    if (!result) continue;
    entry.setData(result.buffer);
    patchedEntry = entry.entryName;
    previousValue = result.previous;
    break;
  }

  if (!patchedEntry) throw new Error('Không tìm thấy hằng cấu hình server trong JAR mẫu.');
  const output = zip.toBuffer();
  if (output.length < 100_000) throw new Error('JAR đầu ra có kích thước bất thường.');
  return { output, patchedEntry, previousValue };
}
