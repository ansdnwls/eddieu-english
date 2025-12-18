/**
 * 한국어 조사 처리 유틸리티
 */

/**
 * 이름에 "이/가" 조사를 붙여줍니다
 * @param name 이름
 * @returns "OO이" 또는 "OO가"
 */
export function addSubjectParticle(name: string): string {
  if (!name) return "";
  
  // 마지막 글자의 유니코드
  const lastChar = name[name.length - 1];
  const lastCharCode = lastChar.charCodeAt(0);
  
  // 한글인지 확인 (가-힣)
  if (lastCharCode >= 0xAC00 && lastCharCode <= 0xD7A3) {
    // 받침이 있으면 "이", 없으면 "가"
    const hasFinalConsonant = (lastCharCode - 0xAC00) % 28 !== 0;
    return hasFinalConsonant ? `${name}이` : `${name}가`;
  }
  
  // 한글이 아니면 기본적으로 "가" 사용
  return `${name}가`;
}

/**
 * 이름에 "을/를" 조사를 붙여줍니다
 * @param name 이름
 * @returns "OO을" 또는 "OO를"
 */
export function addObjectParticle(name: string): string {
  if (!name) return "";
  
  const lastChar = name[name.length - 1];
  const lastCharCode = lastChar.charCodeAt(0);
  
  if (lastCharCode >= 0xAC00 && lastCharCode <= 0xD7A3) {
    const hasFinalConsonant = (lastCharCode - 0xAC00) % 28 !== 0;
    return hasFinalConsonant ? `${name}을` : `${name}를`;
  }
  
  return `${name}를`;
}



