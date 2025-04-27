// 创建 worker 线程
importScripts('/js/spark-md5.js')
/**
 * 创建切片
 * @param {*} file 上传的文件
 * @param {*} index 切片索引
 * @param {*} chunkSize 切片大小
 * @returns
 */
function createChunk(file, index, chunkSize) {
  // 返回一个promise
  return new Promise((resolve, reject) => {
    // 这里的start和end是文件的大小
    const start = index * chunkSize
    const end = start + chunkSize

    // 创建文件读取器
    const fileReader = new FileReader()

    // 创建sparkMD5
    const spark = new SparkMD5.ArrayBuffer()

    // 创建切片
    const blob = file.slice(start, end)

    // 读取文件
    fileReader.onload = e => {
      // 添加到sparkMD5
      spark.append(e.target.result)
      // 返回结果
      resolve({
        // 切片开始
        chunkStart: start,
        // 切片结束
        chunkEnd: end,
        // 切片索引
        chunkIndex: index,
        // 切片hash
        chunkHash: spark.end(),
        // 切片blob
        chunkBlob: blob,
        // 是否上传
        isUploaded: false,
      })
    }

    // 读取文件
    fileReader.readAsArrayBuffer(blob)
  })
}
