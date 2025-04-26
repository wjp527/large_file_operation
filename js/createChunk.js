//

// 创建 worker 线程
importScripts('/js/spark-md5.js')
function createChunk(file, index, chunkSize) {
  return new Promise((resolve, reject) => {
    // 这里的start和end是文件的大小
    const start = index * chunkSize
    const end = start + chunkSize

    const fileReader = new FileReader()

    const spark = new SparkMD5.ArrayBuffer()
    const blob = file.slice(start, end)

    fileReader.onload = e => {
      spark.append(e.target.result)
      resolve({
        chunkStart: start,
        chunkEnd: end,
        chunkIndex: index,
        chunkHash: spark.end(),
        chunkBlob: blob,
        isUploaded: false,
      })
    }
    fileReader.readAsArrayBuffer(blob)
  })
}
