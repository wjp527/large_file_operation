const express = require('express')
// const multer = require('multer')
const busboy = require('busboy')
const path = require('path')

const fs = require('fs')
const fsPromises = require('fs').promises

const { getUniqFilename, removeDir } = require('./utils')

const UPLOAD_DIR = path.join(__dirname, 'uploads')

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// 文件哈希映射存储（实际应用中应使用数据库）
// 格式: { fileHash: { filename: 'xxx', path: 'xxx' } }
const fileHashMap = {}

// 初始化哈希映射（读取已有文件的哈希，实际应用中应从数据库加载）
function initFileHashMap() {
  try {
    // 如果存在哈希映射文件，则加载它
    const hashMapPath = path.join(__dirname, 'fileHashMap.json')
    if (fs.existsSync(hashMapPath)) {
      const data = fs.readFileSync(hashMapPath, 'utf8')
      Object.assign(fileHashMap, JSON.parse(data))
    }
  } catch (error) {
    console.error('初始化文件哈希映射失败:', error)
  }
}

// 保存哈希映射到文件（实际应用中应保存到数据库）
function saveFileHashMap() {
  try {
    const hashMapPath = path.join(__dirname, 'fileHashMap.json')
    fs.writeFileSync(hashMapPath, JSON.stringify(fileHashMap, null, 2), 'utf8')
  } catch (error) {
    console.error('保存文件哈希映射失败:', error)
  }
}

// 初始化哈希映射
initFileHashMap()

const router = express.Router()

// 文件验证接口（秒传功能）
router.get('/verify', (req, res) => {
  const { fileHash, filename } = req.query

  if (fileHash && fileHashMap[fileHash]) {
    // 文件已存在，返回成功和文件路径
    const fileInfo = fileHashMap[fileHash]
    res.json({
      exists: true,
      url: `/uploads/${path.basename(fileInfo.path)}`,
    })
  } else {
    // 文件不存在，需要上传
    res.json({
      exists: false,
    })
  }
})

router.get('/getUploadedChunks', (req, res) => {
  const { filename } = req.query
  const chunkDir = path.join(UPLOAD_DIR, `${filename}_CHUNKS_FOLDER_MARK_`)
  let uploadedChunks = []

  // 如果目录存在，则读取目录下的所有文件
  if (fs.existsSync(chunkDir)) {
    // 读取目录下的所有文件，并返回文件名的索引
    uploadedChunks = fs.readdirSync(chunkDir).map(name => parseInt(name.split('_')[1]))
  }

  res.json(uploadedChunks)
})

router.post('/upload', (req, res) => {
  const bb = busboy({
    headers: req.headers,
  })
  let chunkIndex, chunkHash, filename, fileHash, writeStream

  req.on('aborted', () => {
    const chunkDir = path.join(UPLOAD_DIR, `${filename}_CHUNKS_FOLDER_MARK_`)
    const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`)
    writeStream && writeStream.end()
    fs.existsSync(chunkPath) && fsPromises.unlink(chunkPath)
  })

  bb.on('field', (fieldname, value) => {
    if (fieldname === 'chunkIndex') chunkIndex = value
    if (fieldname === 'chunkHash') chunkHash = value
    if (fieldname === 'filename') filename = value
    if (fieldname === 'fileHash') fileHash = value
    if (fieldname === 'fileBlob' && value === 'undefined') {
      res.status(400).json({
        msg: '文件切片数据不存在',
      })
    }
  })
  // 如果请求被中止，则删除正在写的分片

  bb.on('file', (fieldname, file) => {
    const chunkDir = path.join(UPLOAD_DIR, `${filename}_CHUNKS_FOLDER_MARK_`)
    fs.mkdir(
      chunkDir,
      {
        // 如果目录不存在，则创建目录【递归创建】
        recursive: true,
      },
      err => {
        if (err) {
          return res.status(500).json({
            msg: '无法创建文件夹',
            error: err.message,
          })
        }

        const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`)
        writeStream = fs.createWriteStream(chunkPath)

        file.pipe(writeStream)
        writeStream.on('close', () => {
          res.sendStatus(200)
        })

        writeStream.on('error', () => {
          res.status(500).json({
            msg: '保存文件失败',
            error: err.message,
          })
        })
      }
    )
  })

  // 将请求体中的数据传递给busboy
  req.pipe(bb)
})

router.post('/merge', async (req, res) => {
  const { filename, fileHash } = req.body

  if (!filename) {
    return res.status(400).json({
      msg: '文件名不能为空',
    })
  }

  const chunkDir = path.join(UPLOAD_DIR, `${filename}_CHUNKS_FOLDER_MARK_`)
  console.log(chunkDir, 'chunkDir')
  if (!fs.existsSync(chunkDir)) {
    console.log(456)
    return res.status(400).json({
      msg: '要合并的文件不存在xxxx',
    })
  }
  const indexs = fs.readdirSync(chunkDir).map(name => parseInt(name.split('_')[1]))
  const indexSort = indexs.sort((a, b) => a - b)
  const unqieFilename = getUniqFilename(UPLOAD_DIR, filename)
  const finalFilePath = path.join(UPLOAD_DIR, unqieFilename)
  const writeStream = fs.createWriteStream(finalFilePath)

  for (let index = 0; index < indexSort.length; index++) {
    const chunkPath = path.join(chunkDir, `chunk_${index}`)
    const chunk = fs.readFileSync(chunkPath)
    writeStream.write(chunk)
  }

  writeStream.end()
  // fs.rmdirSync(chunkDir)

  await removeDir(chunkDir)

  // 如果提供了文件哈希，保存到哈希映射中（用于秒传）
  if (fileHash) {
    fileHashMap[fileHash] = {
      filename: unqieFilename,
      path: finalFilePath,
    }

    // 保存哈希映射
    saveFileHashMap()
  }

  res.sendStatus(200)
})

module.exports = router
