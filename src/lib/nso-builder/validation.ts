const hostPattern = /^(localhost|([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*|([0-9]{1,3}\.){3}[0-9]{1,3})$/i;
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidNsoHost(value: string) {
  if (!hostPattern.test(value) || value.length > 253) return false;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return true;
  return value.split('.').every((part) => Number(part) <= 255);
}

export function validateNsoServer(serverName: string, serverHost: string, serverPort: number) {
  if (serverName.length < 2 || serverName.length > 40 || /[\x00-\x1f\\/:,*?"<>|]/.test(serverName) || /[\u{10000}-\u{10ffff}]/u.test(serverName)) {
    return 'Tên server cần từ 2–40 ký tự và không chứa dấu phẩy hoặc ký tự tên file đặc biệt.';
  }
  if (!isValidNsoHost(serverHost)) {
    return 'IP hoặc tên miền không hợp lệ. Không nhập http:// hay port tại ô này.';
  }
  if (!Number.isSafeInteger(serverPort) || serverPort < 1 || serverPort > 65535) {
    return 'Port phải là số từ 1 đến 65535.';
  }
  return null;
}

