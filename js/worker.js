importScripts('./createChunk.js')

// 接受消息
onmessage = async e => {
  // file: 上传的文件
  // CHUNK_SIZE: 切片大小
  // start: 开始索引
  // end: 结束索引
  // uploadedChunks: 已经上传的切片
  const { file, CHUNK_SIZE, start, end, uploadedChunks } = e.data

  // 已经上传的切片个数
  let doneNumber = 0

  // 哪些块分给哪些worker线程来处理
  for (let index = start; index < end; index++) {
    // 如果已经上传的切片包含当前索引，则将当前索引标记为已上传
    if (uploadedChunks.includes(index)) {
      doneNumber++

      // 发送消息
      // 如果已经上传的切片个数等于结束索引减去开始索引，则将线程标记为完成
      postMessage({
        // 是否完成
        isThreadDone: doneNumber === end - start,
        // 当前切片索引
        chunkIndex: index,
        // 是否上传
        isUploaded: true,
      })
      continue
    }

    // 创建切片
    const res = await createChunk(file, index, CHUNK_SIZE)

    doneNumber++
    // 如果已经上传的切片个数等于结束索引减去开始索引，则将线程标记为完成
    if (doneNumber === end - start) {
      res.isThreadDone = true
    }

    // 发送消息
    postMessage(res)
  }
}
