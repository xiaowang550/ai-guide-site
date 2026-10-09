/** 拆分建表脚本，保留引号内的分号与换行，移除 SQL 注释。 */
export function schemaStatements(sql: string): string[] {
  const statements: string[] = []
  let current = '',
    quote = '',
    comment = ''
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i],
      next = sql[i + 1]
    if (comment === 'line') {
      if (char === '\n') {
        comment = ''
        current += ' '
      }
      continue
    }
    if (comment === 'block') {
      if (char === '*' && next === '/') {
        comment = ''
        current += ' '
        i++
      }
      continue
    }
    if (quote) {
      current += char
      if (char === quote) {
        if (next === quote && quote !== ']') {
          current += next
          i++
        } else quote = ''
      }
      continue
    }
    if (char === '-' && next === '-') {
      comment = 'line'
      i++
      continue
    }
    if (char === '/' && next === '*') {
      comment = 'block'
      i++
      continue
    }
    if (char === "'" || char === '"' || char === '`' || char === '[') {
      quote = char === '[' ? ']' : char
      current += char
    } else if (char === ';') {
      if (current.trim()) statements.push(current.trim())
      current = ''
    } else current += char
  }
  if (current.trim()) statements.push(current.trim())
  return statements
}
