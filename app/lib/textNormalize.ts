export function normalizeName(s: string): string {
  return (s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/^(mr|mrs|ms|miss|dr|ดร|นาง|น\.ส\.|นางสาว|นาย|ว่าที่)\s+/,'');
}


