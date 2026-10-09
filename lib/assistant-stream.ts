/** SSE 按完整事件解析，支持 UTF-8 分片、多行 data、CRLF 与注释心跳。 */
export async function readSse(
  stream: ReadableStream<Uint8Array>,
  onData: (data: string) => void | Promise<void>,
): Promise<void> {
  const reader = stream.getReader(),
    decoder = new TextDecoder()
  let pending = ''
  const consume = async (final = false) => {
    pending = pending.replace(/\r\n/g, '\n')
    let boundary: number
    while ((boundary = pending.indexOf('\n\n')) >= 0) {
      const block = pending.slice(0, boundary)
      pending = pending.slice(boundary + 2)
      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
      if (data) await onData(data)
    }
    if (pending.length > 200000) throw new Error('流式响应过大')
    if (final && pending.trim()) {
      pending += '\n\n'
      await consume()
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      pending += decoder.decode(value, { stream: true })
      await consume()
    }
    pending += decoder.decode()
    await consume(true)
  } finally {
    reader.releaseLock()
  }
}
