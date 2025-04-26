// 切片模块
// 切片大小
const CHUNK_SIZE = 10 * 1024 * 1024 // 5MB

// 线程数
const THREAD_COUNT = navigator.hardwareConcurrency || 4

export function cutFile(file, uploadedChunks, callback) {
  return new Promise((resolve, reject) => {
    // 切片个数
    const chunkCount = Math.ceil(file.size / CHUNK_SIZE)
    // 每个线程的切片个数
    const threadChunkCount = Math.ceil(chunkCount / THREAD_COUNT)

    // 实际创建的线程数
    let createWorkerNumber = 0
    // 实际关闭的线程数
    let closeWorkerNumber = 0

    for (let i = 0; i < THREAD_COUNT; i++) {
      // 这里的start和end 是 切片的索引
      const start = i * threadChunkCount
      let end = (i + 1) * threadChunkCount

      if (end > chunkCount) {
        end = chunkCount
      }

      // debugger
      if (start >= end) {
        continue
      }
      createWorkerNumber++
      console.log(start, end)

      // 创建 worker 线程
      const worker = new Worker('/js/worker.js')
      // 监听错误
      worker.onerror = err => console.log('worker error: ', i, err)
      // 发送消息
      worker.postMessage({
        file,
        CHUNK_SIZE,
        start,
        end,
        uploadedChunks,
      })

      worker.onmessage = e => {
        if (e.data.isThreadDone) {
          worker.terminate()
          closeWorkerNumber++
        }
        if (e.data.isUploaded) return
        // closeWorkerNumber == createWorkerNumber: 所有的线程都已经完成了
        callback(e.data, closeWorkerNumber == createWorkerNumber)
      }
    }
  })
}
