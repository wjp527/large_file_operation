// 导入SparkMD5库
importScripts('/js/spark-md5.js')

// 处理主线程的消息
onmessage = function (e) {
  const { file } = e.data
  calculateHash(file)
    .then(hash => {
      // 计算完成后，将哈希值发送回主线程
      postMessage({ hash })
    })
    .catch(error => {
      postMessage({ error: error.message })
    })
}

// 计算整个文件的哈希值
function calculateHash(file) {
  return new Promise((resolve, reject) => {
    const chunkSize = 2 * 1024 * 1024 // 每次读取2MB
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0
    const spark = new SparkMD5.ArrayBuffer()
    const fileReader = new FileReader()

    // 读取下一个块
    function loadNext() {
      const start = currentChunk * chunkSize
      const end = start + chunkSize >= file.size ? file.size : start + chunkSize

      fileReader.readAsArrayBuffer(file.slice(start, end))
    }

    // 当一个块加载完成
    fileReader.onload = e => {
      spark.append(e.target.result) // 将块添加到hash计算中
      currentChunk++

      if (currentChunk < chunks) {
        // 还有更多块要读取
        loadNext()
      } else {
        // 所有块都已读取，完成哈希计算
        const hash = spark.end()
        resolve(hash)
      }
    }

    // 处理错误
    fileReader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    // 开始读取第一个块
    loadNext()
  })
}
