// 不同资源站对同一部影片的片名写法常有细微差别：多一个空格、大小写不同、
// 用全角冒号或全角数字。换源列表按片名匹配，所以比较前先把这些差别抹平。
// 不做模糊匹配：季数不同或多出文字的片名仍然算不同影片。
const normalizeTitle = (title: string): string => {
  let value = title;
  try {
    value = value.normalize("NFKC");
  } catch {
    // 个别运行环境不支持 normalize，退回到只处理空格和大小写
  }
  return value.replace(/\s+/g, "").toLowerCase();
};

export function isSameTitle(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = normalizeTitle(a);
  return left.length > 0 && left === normalizeTitle(b);
}
