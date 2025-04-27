// 切片模块
// 切片大小
const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB

// 线程数
const THREAD_COUNT = navigator.hardwareConcurrency || 4

/**
 * 切分文件
 * @param {*} file 上传的文件
 * @param {*} uploadedChunks 已经上传的切片
 * @param {*} callback 回调函数
 * @returns
 */
export function cutFile(file, uploadedChunks, callback) {
  console.log(uploadedChunks, 'uploadedChunks')
  // 返回一个promise
  return new Promise((resolve, reject) => {
    // 切片个数[1个文件 / 切片大小]
    const chunkCount = Math.ceil(file.size / CHUNK_SIZE)
    // 每个线程的切片个数
    const threadChunkCount = Math.ceil(chunkCount / THREAD_COUNT)
    console.log(threadChunkCount, 'threadChunkCount')
    // 遍历线程
    for (let i = 0; i < THREAD_COUNT; i++) {
      // 这里的start和end 是 切片的索引
      const start = i * threadChunkCount
      let end = (i + 1) * threadChunkCount

      // 如果end大于切片个数，则end等于切片个数
      if (end > chunkCount) {
        end = chunkCount
      }

      // debugger
      // 如果start大于end，则跳过
      if (start >= end) {
        continue
      }
      console.log(start, end)

      // 创建 worker 线程
      const worker = new Worker('/js/worker.js')
      // 监听错误
      worker.onerror = err => console.log('worker error: ', i, err)
      // 发送消息
      worker.postMessage({
        // 文件
        file,
        // 切片大小
        CHUNK_SIZE,
        // 开始索引
        start,
        // 结束索引
        end,
        // 已经上传的切片【文件的索引】
        uploadedChunks,
      })

      // 接受消息
      worker.onmessage = e => {
        // 如果线程完成
        if (e.data.isThreadDone) {
          // 终止线程
          worker.terminate()
        }
        // 回调函数
        callback(e.data, chunkCount)
      }
    }
  })
}
